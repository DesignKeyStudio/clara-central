import type { SupabaseClient } from "@supabase/supabase-js";
import type { user_role } from "@prisma/client";

/**
 * The subset of Supabase access-token JWT claims this app reads. Typed locally
 * (rather than importing Supabase's `JwtPayload`) so the shape is stable across
 * client versions and the `role` / metadata fields are easy to narrow.
 */
type SupabaseJwtClaims = {
  sub?: string;
  email?: string;
  app_metadata?: { role?: unknown } & Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

/** Normalized current user resolved from the verified access-token claims. */
export type ClaimsUser = {
  id: string;
  email: string | null;
  /** App role from `app_metadata` (non-editable). null when unrecognized. */
  role: user_role | null;
  userMetadata: Record<string, unknown> | undefined;
};

/**
 * Resolve the current user from the access token via `getClaims()`.
 *
 * Unlike `getUser()` — which makes a network round-trip to the Supabase Auth
 * server on every call — `getClaims()` verifies the JWT signature **locally**
 * using the project's JWKS (asymmetric signing keys), with no network hop. This
 * is the per-request hot path (every server action + RSC prefetch), so the
 * local check is what removes the navigation latency.
 *
 * Tradeoff: a server-side revoked session stays valid until the access token
 * expires (default ~1h). Acceptable here because mutation actions also enforce
 * a live DB gate (partner approval / admin isActive), and middleware keeps the
 * authoritative `getUser()` refresh + routing guard.
 *
 * Returns null when there is no valid session.
 */
export async function getClaimsUser(
  supabase: SupabaseClient,
): Promise<ClaimsUser | null> {
  const { data, error } = await supabase.auth.getClaims();
  const claims = (error ? null : data?.claims) as
    | SupabaseJwtClaims
    | null
    | undefined;
  if (!claims?.sub) return null;

  const role = claims.app_metadata?.role;

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    role: role === "admin" || role === "partner" ? (role as user_role) : null,
    userMetadata: claims.user_metadata,
  };
}
