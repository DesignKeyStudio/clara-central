"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClaimsUser } from "@/lib/supabase/claims";
import { isPrototypeMode } from "@/lib/supabase/mock-client";
import { partnerOtpEmailEnabled } from "@/lib/auth-flags";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/services/activity-service";
import { rateLimit } from "@/lib/rate-limit";
import { loginSchema, partnerEmailSchema, partnerOtpSchema } from "@/lib/validations/auth";

type ActionError = { error: string; retryAfterMs?: number };

/**
 * Where a demo-org user lands after signing out. Demo sessions are throwaway
 * sandboxes, not accounts to return to — so logout leaves the app entirely
 * instead of dropping the visitor on the landing page.
 */
const DEMO_SIGN_OUT_URL = "https://www.google.com";

/**
 * The user's active organization (their single membership in iteration 1), or
 * null. Used to stamp best-effort login/logout audit entries with an org, and to
 * pick the post-logout destination (demo orgs leave the app — see
 * {@link DEMO_SIGN_OUT_URL}).
 */
async function activeOrg(userId: string): Promise<{ id: string; isDemo: boolean } | null> {
  const m = await prisma.organizationMembership.findFirst({
    where: { userId },
    select: { organizationId: true, organization: { select: { isDemo: true } } },
  });
  return m ? { id: m.organizationId, isDemo: m.organization.isDemo } : null;
}

/**
 * Admin password sign-in. Sets the session cookies, verifies the account is an
 * admin (role lives in app_metadata), then redirects to the /admin dashboard.
 * Returns `{ error }` on failure; on success it redirects (returns nothing).
 */
export async function adminSignIn(input: { email: string; password: string }): Promise<ActionError | void> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email.trim().toLowerCase(),
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { error: "Invalid email or password." };
  }

  if (data.user.app_metadata?.role !== "admin") {
    await supabase.auth.signOut();
    return { error: "This account does not have admin access." };
  }

  // Deactivated accounts keep valid credentials but must not be able to sign in.
  const profile = await prisma.userProfile.findUnique({
    where: { id: data.user.id },
    select: { isActive: true },
  });
  if (profile && !profile.isActive) {
    await supabase.auth.signOut();
    return { error: "This account has been deactivated. Contact your administrator." };
  }

  const org = await activeOrg(data.user.id);
  if (org) {
    await logActivity({
      organizationId: org.id,
      userId: data.user.id,
      action: "logged_in",
      entityType: "user",
      entityId: data.user.id,
      entityName: data.user.email ?? null,
    }).catch(() => {});
  }

  redirect("/admin");
}

/**
 * Partner OTP — step 1. Gates on an approved, linked partner. When email
 * delivery is enabled (`NEXT_PUBLIC_PARTNER_OTP_EMAIL="true"`) it sends a real
 * 6-digit email OTP via Supabase (`signInWithOtp` with `shouldCreateUser: false`,
 * since approved partners already have an auth user provisioned at approval);
 * otherwise it skips the send and the code screen accepts any 6 digits (session
 * minted at verify — see {@link verifyPartnerOtp}). A non-partner / non-approved
 * email never advances.
 *
 * Lightweight rate limiting (per IP + per email) blunts enumeration and
 * code-spam — see {@link rateLimit}. In PROTOTYPE_MODE the Supabase call is
 * mocked (no email sent).
 *
 * Note: returning a distinct error for a non-partner email reveals whether an
 * email is an approved partner (email-enumeration) — an accepted trade-off to
 * match the spec's flow.
 */
export async function requestPartnerOtp(input: { email: string }): Promise<ActionError | { ok: true }> {
  const parsed = partnerEmailSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Enter a valid email." };
  }
  const email = parsed.data.email.trim().toLowerCase();

  // Abuse protection: throttle by client IP (blunts enumeration across many
  // emails) and by email (blunts code-spam at one partner). Checked before the
  // DB lookup so probing is throttled regardless of whether the email exists.
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ipLimit = rateLimit(`otp:ip:${ip}`, { limit: 10, windowMs: 10 * 60_000 });
  const emailLimit = rateLimit(`otp:email:${email}`, { limit: 3, windowMs: 5 * 60_000 });
  if (!ipLimit.allowed || !emailLimit.allowed) {
    // Surface how long until the caller may retry so the client can keep the
    // "Resend code" control disabled for exactly that long. An allowed bucket
    // reports retryAfterMs 0, so Math.max picks the blocking one.
    const retryAfterMs = Math.max(ipLimit.retryAfterMs, emailLimit.retryAfterMs);
    return { error: "Too many requests. Please wait a few minutes and try again.", retryAfterMs };
  }

  // email is unique per-org now; a partner's auth identity is still global, and
  // demo-org partners never use this OTP page (they enter via /demo auto-login),
  // so the first approved match is the intended real partner.
  const partner = await prisma.partner.findFirst({
    where: { email },
    // Deterministic when the email exists in >1 org (per-org unique now): the
    // oldest partner is the real one — demo-org partners are always newer and
    // never use this OTP page.
    orderBy: { createdAt: "asc" },
    select: { status: true, userId: true, user: { select: { isActive: true } } },
  });
  if (
    !partner ||
    partner.status !== "approved" ||
    !partner.userId ||
    partner.user?.isActive === false
  ) {
    return { error: "No active partner account for that email." };
  }

  // Send a real OTP only when email delivery is configured (and not in the mock).
  // shouldCreateUser:false guarantees only the already-provisioned partner auth
  // user receives a code — it never creates a user. Otherwise we skip the send:
  // the code screen accepts any 6 digits and the session is minted at verify.
  if (partnerOtpEmailEnabled() && !isPrototypeMode()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (error) {
      // Supabase enforces its own resend cooldown (`max_frequency`, default 60s).
      // When it rejects for rate limiting, pass a retry hint so the client keeps
      // the resend control disabled (Supabase doesn't return a precise delay here).
      if (error.status === 429 || error.code === "over_email_send_rate_limit") {
        return { error: "Too many requests. Please wait a minute and try again.", retryAfterMs: 60_000 };
      }
      return { error: "Could not send a code. Please try again." };
    }
  }

  return { ok: true };
}

/**
 * Partner OTP — step 2. Re-asserts the partner is approved+linked+active, then
 * establishes the session, updates `lastLoginAt`, and redirects to /partner.
 * When email delivery is enabled (`NEXT_PUBLIC_PARTNER_OTP_EMAIL="true"`) it
 * verifies the user-entered `code` against the real emailed OTP (`verifyOtp`,
 * type "email") and re-asserts the `partner` role. Otherwise (default, or
 * PROTOTYPE_MODE) it accepts any 6 digits and mints the session server-side via
 * a service-role `generateLink` (no email sent) — the partner gate above still
 * limits this to approved partners.
 */
export async function verifyPartnerOtp(input: { email: string; code: string }): Promise<ActionError | void> {
  const parsed = partnerOtpSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Enter the 6-digit code." };
  }
  const email = parsed.data.email.trim().toLowerCase();

  const partner = await prisma.partner.findFirst({
    where: { email },
    // Deterministic across orgs (see requestPartnerOtp) so the login audit +
    // lastLoginAt land on the right partner row.
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      organizationId: true,
      status: true,
      userId: true,
      user: { select: { isActive: true } },
    },
  });
  if (
    !partner ||
    partner.status !== "approved" ||
    !partner.userId ||
    partner.user?.isActive === false
  ) {
    return { error: "No active partner account for that email." };
  }

  const supabase = await createClient();

  if (partnerOtpEmailEnabled() && !isPrototypeMode()) {
    // Real emailed OTP (TKT-001): verify the exact code the partner received;
    // sets the session cookies on success, then re-assert the partner role
    // (defense in depth).
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: parsed.data.code,
      type: "email",
    });
    if (verifyError || !data.user) {
      return { error: "That code is invalid or has expired. Please try again." };
    }
    if (data.user.app_metadata?.role !== "partner") {
      await supabase.auth.signOut();
      return { error: "This account does not have partner access." };
    }
  } else {
    // No email delivery configured (default) or PROTOTYPE_MODE: accept any
    // 6-digit code and mint the REAL session server-side — the service-role
    // client generates an email OTP for this already-approved partner (no email
    // sent), which we immediately verify to set the session cookies. The partner
    // gating above still restricts this to approved+linked+active partners.
    const admin = createAdminClient();
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    const emailOtp = linkData?.properties?.email_otp;
    if (linkError || !emailOtp) {
      return { error: "Could not start a session. Please try again." };
    }
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: emailOtp,
      type: "email",
    });
    if (verifyError) {
      return { error: "Could not verify the code. Please try again." };
    }
  }

  await prisma.partner
    .update({ where: { id: partner.id }, data: { lastLoginAt: new Date() } })
    .catch(() => {});

  await logActivity({
    organizationId: partner.organizationId,
    userId: partner.userId,
    action: "logged_in",
    // Authentication events are logged against the auth user (audit-log spec),
    // matching admin login — not the partner domain entity.
    entityType: "user",
    entityId: partner.userId ?? partner.id,
    entityName: email,
  }).catch(() => {});

  redirect("/partner");
}

/**
 * Sign out and return to the landing page — except for demo orgs, which leave
 * the app entirely (see {@link DEMO_SIGN_OUT_URL}): a demo session has no
 * account to sign back into, so the landing page is a dead end.
 */
export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  const claimsUser = await getClaimsUser(supabase);
  let isDemo = false;

  if (claimsUser) {
    const org = await activeOrg(claimsUser.id);
    if (org) {
      isDemo = org.isDemo;
      await logActivity({
        organizationId: org.id,
        userId: claimsUser.id,
        action: "logged_out",
        entityType: "user",
        entityId: claimsUser.id,
        entityName: claimsUser.email ?? null,
      }).catch(() => {});
    }
  }

  await supabase.auth.signOut();
  redirect(isDemo ? DEMO_SIGN_OUT_URL : "/");
}
