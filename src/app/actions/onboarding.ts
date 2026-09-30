"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { provisionPartnerAuthUser } from "@/lib/supabase/partner-auth";
import {
  acceptInvite,
  getActiveInviteByEmail,
  getValidInviteByToken,
} from "@/lib/services/invite-service";
import { createSelfSignupApplication, emailInUse } from "@/lib/services/partner-service";
import { logActivity } from "@/lib/services/activity-service";
import { ORG_DEFAULT_ID } from "@/lib/organization";
import { notifyAdminNewSignup, notifyAdminPartnerOnboarded } from "@/lib/notifications";
import { resolveOrigin } from "@/lib/site-url";
import { applyToJoinSchema, completeOnboardingSchema } from "@/lib/validations/partner";

/** `field` lets the client bind the error inline (e.g. under the email input). */
type ActionError = { error: string; field?: "email" };

/** Trim a string; empty becomes null (for nullable text columns). */
function orNull(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Public (unauthenticated) — finish onboarding from an invite link. Re-validates
 * the token, creates the Supabase auth user (role=partner, OTP-only), provisions
 * the approved Partner via {@link acceptInvite}, mints a session (same trick as
 * `verifyPartnerOtp`), then redirects into the portal. Because an admin invited
 * them, no approval step is needed. Returns `{ error }` on failure; on success it
 * redirects (returns nothing). The email is locked to the invite — never taken
 * from the form.
 */
export async function completeOnboardingAction(
  token: string,
  input: unknown,
): Promise<ActionError | void> {
  const parsed = completeOnboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please complete the required fields." };
  }
  const d = parsed.data;

  const invite = await getValidInviteByToken(token);
  if (!invite) {
    return { error: "This invitation is invalid or has expired." };
  }

  const admin = createAdminClient();

  // 1. Create the auth user (no password — partners sign in via OTP), or reclaim
  //    an ORPHANED one (an auth user left behind with no partner/profile — e.g.
  //    after a reseed). Only a genuine, live account blocks onboarding.
  const provisioned = await provisionPartnerAuthUser(admin, {
    email: invite.email,
    fullName: d.fullName.trim(),
  });
  if ("conflict" in provisioned) {
    // The email already has a real, linked account — surface a blocking, field-bound message.
    return {
      error: "An account with this email address already exists. Please contact support.",
      field: "email",
    };
  }
  const userId = provisioned.userId;

  // 2. Provision the partner + mark the invite accepted. Roll back the auth user
  //    if anything fails so we don't leave an orphaned login.
  let partnerId: string;
  let inviteId: string;
  try {
    ({ partnerId, inviteId } = await acceptInvite(token, userId, {
      fullName: d.fullName.trim(),
      phone: orNull(d.phone),
      companyName: orNull(d.companyName),
      role: orNull(d.role),
      location: orNull(d.location),
      website: orNull(d.website),
      typesOfReferrals: orNull(d.typesOfReferrals),
    }));
  } catch (e) {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return {
        error: "An account with this email address already exists. Please contact support.",
        field: "email",
      };
    }
    return { error: e instanceof Error ? e.message : "Could not complete onboarding." };
  }

  // 3. Mint a session: admin generates an email OTP (no email sent), we verify it
  //    to set the session cookies. Mirrors verifyPartnerOtp in actions/auth.ts.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: invite.email,
  });
  const emailOtp = linkData?.properties?.email_otp;
  if (!linkError && emailOtp) {
    const supabase = await createClient();
    const { error: verifyError } = await supabase.auth
      .verifyOtp({ email: invite.email, token: emailOtp, type: "email" })
      .catch(() => ({ error: new Error("verify failed") }));
    // Completing onboarding logs the partner in — record it as their first login
    // (mirrors verifyPartnerOtp; otherwise "Last login" stays empty until they
    // sign out and back in via OTP).
    if (!verifyError) {
      await prisma.partner
        .update({ where: { id: partnerId }, data: { lastLoginAt: new Date() } })
        .catch(() => {});
    }
  }

  await logActivity({
    userId,
    action: "created",
    entityType: "partner",
    entityId: partnerId,
    entityName: invite.email,
    changes: {
      fullName: d.fullName.trim(),
      email: invite.email,
      phone: orNull(d.phone),
      companyName: orNull(d.companyName),
      role: orNull(d.role),
      location: orNull(d.location),
      website: orNull(d.website),
      status: "approved",
      entryType: "invited",
    },
    organizationId: invite.organizationId,
  }).catch(() => {});

  // AUD-2: the invite itself transitioned pending → accepted inside acceptInvite.
  await logActivity({
    userId,
    action: "status_changed",
    entityType: "partner_invite",
    entityId: inviteId,
    entityName: invite.email,
    changes: { status: { from: "pending", to: "accepted" } },
    organizationId: invite.organizationId,
  }).catch(() => {});

  // Best-effort: alert admins that the invited partner onboarded. Must run before
  // the redirect (redirect() throws, so nothing after it executes).
  await notifyAdminPartnerOnboarded({
    organizationId: invite.organizationId,
    partnerName: d.fullName.trim(),
    companyName: orNull(d.companyName),
    partnerUrl: `${await resolveOrigin()}/admin/partners/${partnerId}`,
  }).catch(() => {});

  // The account is approved and ready either way; if the session couldn't be
  // minted, the partner login page (OTP) is the fallback.
  redirect("/partner");
}

/**
 * Public (unauthenticated) — submit a self-registration application. Creates a
 * `pending` self-signup partner (NO auth user yet; that's provisioned when an
 * admin approves). Returns `{ ok: true }` on success, or `{ error }` — including
 * a friendly message when the email already belongs to a partner.
 */
export async function applyToJoinAction(input: unknown): Promise<ActionError | { ok: true }> {
  const parsed = applyToJoinSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please complete the required fields." };
  }
  const d = parsed.data;
  const email = d.email.trim().toLowerCase();

  // If this email was already invited (pending, unexpired), route them to their
  // invite link instead of creating a duplicate partner — the invite carries the
  // admin-set commission rate and skips re-approval.
  const activeInvite = await getActiveInviteByEmail(ORG_DEFAULT_ID, email);
  if (activeInvite) {
    return {
      error: "You've already been invited — check your email for the invite link.",
      field: "email",
    };
  }

  // Block emails already tied to an existing account (e.g. an admin). Partner
  // collisions are still handled by the P2002 catch below with a status-specific message.
  const inUse = await emailInUse(email, { organizationId: ORG_DEFAULT_ID });
  if (inUse.profile) {
    return { error: "This email is already associated with an existing account.", field: "email" };
  }

  try {
    const { id } = await createSelfSignupApplication(ORG_DEFAULT_ID, {
      fullName: d.fullName.trim(),
      email,
      phone: orNull(d.phone),
      companyName: orNull(d.companyName),
      role: orNull(d.role),
      location: orNull(d.location),
      website: orNull(d.website),
      howDidYouHear: orNull(d.howDidYouHear),
      typesOfReferrals: orNull(d.typesOfReferrals),
    });

    await logActivity({
      userId: null,
      action: "created",
      entityType: "partner",
      entityId: id,
      entityName: email,
      changes: {
        fullName: d.fullName.trim(),
        email,
        phone: orNull(d.phone),
        companyName: orNull(d.companyName),
        role: orNull(d.role),
        location: orNull(d.location),
        website: orNull(d.website),
        howDidYouHear: orNull(d.howDidYouHear),
        status: "pending",
        entryType: "self_signup",
      },
      organizationId: ORG_DEFAULT_ID,
    }).catch(() => {});

    // Best-effort: alert admins a new application needs review.
    await notifyAdminNewSignup({
      organizationId: ORG_DEFAULT_ID,
      applicantName: d.fullName.trim(),
      applicantEmail: email,
      companyName: orNull(d.companyName),
      reviewUrl: `${await resolveOrigin()}/admin/partners`,
    }).catch(() => {});

    return { ok: true };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      // Tailor the message to the existing applicant's status (shown inline by email).
      const existing = await prisma.partner
        .findFirst({ where: { organizationId: ORG_DEFAULT_ID, email }, select: { status: true } })
        .catch(() => null);
      const message =
        existing?.status === "approved"
          ? "An account with this email already exists and is approved. Please sign in via the Partner Portal."
          : existing?.status === "rejected"
            ? "An application with this email was previously declined. Please contact support."
            : existing?.status === "pending"
              ? "An application with this email is already under review."
              : "An account with this email already exists.";
      return { error: message, field: "email" };
    }
    throw e;
  }
}
