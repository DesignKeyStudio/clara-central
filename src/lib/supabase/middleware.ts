import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isPrototypeMode } from "./mock-client";

// `/admin` is the dashboard landing AND the portal-isolation prefix — it matches
// every /admin/* route, so partners are bounced from any admin page (not just Partners).
const ADMIN_HOME = "/admin";
const PARTNER_HOME = "/partner";
const LANDING = "/";

/** Routes reachable without a session. */
const PUBLIC_ROUTES = [
  LANDING,
  "/admin/login",
  "/admin/forgot-password",
  "/admin/reset-password",
  "/partner/login",
  "/auth/callback",
  "/invite", // public partner onboarding (token-gated); covers /invite/<token>
  "/apply", // public partner self-registration ("Apply to join")
  "/demo", // public demo entry (?role=admin|partner) — spins up/reuses an isDemo org
  "/r", // public per-partner referral links (code-gated); covers /r/<referralCode>
  "/terms", // public referral-partner Terms & Conditions (linked from onboarding)
];

/**
 * Login/landing routes an authenticated user should be bounced away from.
 * NOTE: `/admin/reset-password` is intentionally NOT here — the password-reset
 * link lands an authenticated *recovery* session on that page, so bouncing
 * authenticated users would make the form unreachable. The page self-gates on a
 * recovery session (redirects to forgot-password when there's none).
 */
const ENTRY_ROUTES = [
  LANDING,
  "/admin/login",
  "/admin/forgot-password",
  "/partner/login",
];

function redirectTo(request: NextRequest, pathname: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

function isPublicRoute(pathname: string): boolean {
  if (pathname === LANDING) return true;
  return PUBLIC_ROUTES.some(
    (route) => route !== LANDING && (pathname === route || pathname.startsWith(route + "/")),
  );
}

/**
 * Two-portal session guard. Roles live in Supabase `app_metadata` (not
 * user-editable). Admins are confined to `/admin/*`, partners to `/partner/*`;
 * authenticated users are bounced off landing/login routes into their portal.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;

  // PROTOTYPE_MODE: demo user is an always-logged-in admin.
  if (isPrototypeMode()) {
    if (ENTRY_ROUTES.includes(pathname) || pathname.startsWith(PARTNER_HOME)) {
      return redirectTo(request, ADMIN_HOME);
    }
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Intentionally `getUser()` (not `getClaims()`): middleware is the session
  // refresh point — this call refreshes the access token and persists it via the
  // `setAll` cookie handler above. It also keeps routing-level revocation
  // authoritative (a revoked user is bounced on their next navigation). The
  // per-request hot paths (getSessionContext / server-user) use local
  // `getClaims()` instead — that's where the navigation latency lived.
  const { data: { user } } = await supabase.auth.getUser();

  // Unauthenticated → only public routes; everything else goes to the landing.
  if (!user) {
    return isPublicRoute(pathname) ? supabaseResponse : redirectTo(request, LANDING);
  }

  const role = user.app_metadata?.role;
  const home = role === "partner" ? PARTNER_HOME : ADMIN_HOME;

  // Authenticated on a landing/login route → their portal home.
  if (ENTRY_ROUTES.includes(pathname)) {
    return redirectTo(request, home);
  }

  // Portal isolation.
  if (role === "admin" && pathname.startsWith(PARTNER_HOME)) {
    return redirectTo(request, ADMIN_HOME);
  }
  if (role === "partner" && pathname.startsWith(ADMIN_HOME)) {
    return redirectTo(request, PARTNER_HOME);
  }

  return supabaseResponse;
}
