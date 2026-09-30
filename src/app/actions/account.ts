"use server";

import { headers } from "next/headers";
import { getSessionContext } from "@/lib/actions/auth-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isPrototypeMode } from "@/lib/supabase/mock-client";
import { partnerOtpEmailEnabled } from "@/lib/auth-flags";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { diffChanges, logActivity } from "@/lib/services/activity-service";
import {
  emailInUse,
  getPartnerProfile,
  updatePartnerAvatar,
  updatePartnerProfile,
} from "@/lib/services/partner-service";
import { isDemoOrg } from "@/lib/services/organization-service";
import { getUserProfile, updateUserProfile } from "@/lib/services/user-profile-service";
import {
  avatarPublicUrl,
  createAvatarUploadUrl,
  pruneAvatarObjects,
} from "@/lib/supabase/avatar-storage";
import {
  requestEmailChangeSchema,
  updateAdminProfileSchema,
  verifyEmailChangeSchema,
} from "@/lib/validations/account";
import { prepareAvatarUploadSchema, updatePartnerProfileSchema } from "@/lib/validations/partner";
import { fileExtension, validateCoverImage } from "@/lib/validations/marketing";

/**
 * The signed-in user's own profile, shaped by role. Admins edit only their
 * identity; partners edit their full contact card + notification prefs. `email`
 * is always present but read-only (login identity). Nullable columns come back as
 * "" so the client form stays controlled. `isDemo` lets the profile page hide the
 * change-email dialog in a demo sandbox (the actions refuse it server-side too).
 */
export type MyProfile =
  | {
      kind: "admin";
      fullName: string;
      email: string;
      phone: string;
      notifyByEmail: boolean;
      notifyBySms: boolean;
      isDemo: boolean;
    }
  | {
      kind: "partner";
      fullName: string;
      email: string;
      phone: string;
      companyName: string;
      role: string;
      location: string;
      website: string;
      avatarUrl: string | null;
      notifyByEmail: boolean;
      notifyBySms: boolean;
      isDemo: boolean;
    };

export type UpdateMyProfileResult = { ok: true } | { error: string };

/** Trim a string; empty becomes null (for nullable text columns). */
function orNull(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Best-effort: mirror the display name onto the Supabase auth `user_metadata` so
 * the JWT-derived header name matches the DB. Never throws — the DB row is the
 * source of truth (and `getPlatformServerUser` prefers it), so a metadata sync
 * failure only delays the header update until the next token refresh.
 */
async function syncAuthDisplayName(userId: string, fullName: string): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.auth.admin.updateUserById(userId, { user_metadata: { full_name: fullName } });
  } catch {
    // ignore
  }
}

/** The signed-in user's own profile (admin identity, or partner contact card). */
export async function getMyProfileAction(): Promise<MyProfile> {
  const ctx = await getSessionContext();
  const isDemo = await isDemoOrg(ctx.organizationId);

  if (ctx.role === "partner") {
    if (!ctx.partnerId) throw new Error("Forbidden");
    const p = await getPartnerProfile(ctx.organizationId, ctx.partnerId);
    if (!p) throw new Error("Profile not found");
    return {
      kind: "partner",
      isDemo,
      fullName: p.fullName,
      email: p.email,
      phone: p.phone ?? "",
      companyName: p.companyName ?? "",
      role: p.role ?? "",
      location: p.location ?? "",
      website: p.website ?? "",
      avatarUrl: p.avatarUrl,
      notifyByEmail: p.notifyByEmail,
      notifyBySms: p.notifyBySms,
    };
  }

  const u = await getUserProfile(ctx.userId);
  if (!u) throw new Error("Profile not found");
  return {
    kind: "admin",
    isDemo,
    fullName: u.fullName,
    email: u.email,
    phone: u.phone ?? "",
    notifyByEmail: u.notifyByEmail,
    notifyBySms: u.notifyBySms,
  };
}

/**
 * Update the signed-in user's own profile. Validation + persistence are role-aware;
 * `email` is never accepted (read-only). On success the display name is mirrored to
 * the auth metadata and the change is logged (best-effort).
 */
export async function updateMyProfileAction(input: unknown): Promise<UpdateMyProfileResult> {
  const ctx = await getSessionContext();

  if (ctx.role === "partner") {
    if (!ctx.partnerId) throw new Error("Forbidden");
    const parsed = updatePartnerProfileSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid profile details" };
    }
    const d = parsed.data;
    const updates = {
      fullName: d.fullName.trim(),
      phone: orNull(d.phone),
      companyName: orNull(d.companyName),
      role: orNull(d.role),
      location: orNull(d.location),
      website: orNull(d.website),
      notifyByEmail: d.notifyByEmail,
      notifyBySms: d.notifyBySms,
    };
    const before = await getPartnerProfile(ctx.organizationId, ctx.partnerId);
    await updatePartnerProfile(ctx.organizationId, ctx.partnerId, updates);
    await syncAuthDisplayName(ctx.userId, updates.fullName);
    await logActivity({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "updated",
      entityType: "partner",
      entityId: ctx.partnerId,
      entityName: updates.fullName,
      changes: before ? diffChanges(before, updates, Object.keys(updates)) : null,
    }).catch(() => {});
    return { ok: true };
  }

  const parsed = updateAdminProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid profile details" };
  }
  const updates = {
    fullName: parsed.data.fullName.trim(),
    phone: orNull(parsed.data.phone),
    notifyByEmail: parsed.data.notifyByEmail,
    notifyBySms: parsed.data.notifyBySms,
  };
  const before = await getUserProfile(ctx.userId);
  await updateUserProfile(ctx.userId, updates);
  await syncAuthDisplayName(ctx.userId, updates.fullName);
  await logActivity({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "updated",
    entityType: "user",
    entityId: ctx.userId,
    entityName: updates.fullName,
    changes: before ? diffChanges(before, updates, Object.keys(updates)) : null,
  }).catch(() => {});
  return { ok: true };
}

// ── Partner avatar (signed-upload flow → public `avatars` bucket) ──

export type PrepareAvatarUploadResult = { path: string; token: string } | { error: string };
export type AvatarResult = { ok: true; avatarUrl: string | null } | { error: string };

/**
 * Step 1: validate the intended picture and mint a single-use signed upload URL.
 * The path is derived server-side as `${partnerId}/${uuid}.${ext}` so the client
 * can never inject an arbitrary storage key. Partner-only.
 */
export async function prepareAvatarUploadAction(
  input: unknown,
): Promise<PrepareAvatarUploadResult> {
  const ctx = await getSessionContext();
  if (ctx.role !== "partner" || !ctx.partnerId) throw new Error("Forbidden");

  const parsed = prepareAvatarUploadSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid upload request" };

  const check = validateCoverImage({ name: parsed.data.fileName, size: parsed.data.size });
  if (!check.ok) return { error: check.error };

  const path = `${ctx.partnerId}/${crypto.randomUUID()}.${fileExtension(parsed.data.fileName)}`;
  try {
    const { path: storedPath, token } = await createAvatarUploadUrl(path);
    return { path: storedPath, token };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not start the upload" };
  }
}

/**
 * Step 3: after the browser uploaded the bytes, persist the picture's public URL
 * on the partner (mirrored to their UserProfile) and prune the previous blob.
 * The path prefix is re-validated so a caller can't point at another partner's folder.
 */
export async function setMyAvatarAction(path: string): Promise<AvatarResult> {
  const ctx = await getSessionContext();
  if (ctx.role !== "partner" || !ctx.partnerId) throw new Error("Forbidden");
  if (typeof path !== "string" || !path.startsWith(`${ctx.partnerId}/`)) {
    return { error: "Invalid file path" };
  }

  try {
    const url = avatarPublicUrl(path);
    await updatePartnerAvatar(ctx.organizationId, ctx.partnerId, url);
    await pruneAvatarObjects(ctx.partnerId, path).catch(() => {});
    await logActivity({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "updated",
      entityType: "partner",
      entityId: ctx.partnerId,
      entityName: "profile picture",
      changes: { avatarUrl: { to: url } },
    }).catch(() => {});
    return { ok: true, avatarUrl: url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save the picture" };
  }
}

/** Clear the signed-in partner's profile picture and purge all their avatar blobs. */
export async function removeMyAvatarAction(): Promise<AvatarResult> {
  const ctx = await getSessionContext();
  if (ctx.role !== "partner" || !ctx.partnerId) throw new Error("Forbidden");

  await updatePartnerAvatar(ctx.organizationId, ctx.partnerId, null);
  await pruneAvatarObjects(ctx.partnerId).catch(() => {});
  await logActivity({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "updated",
    entityType: "partner",
    entityId: ctx.partnerId,
    entityName: "profile picture",
    changes: { avatarUrl: { to: null } },
  }).catch(() => {});
  return { ok: true, avatarUrl: null };
}

// ── Self-service change-email flow (mocked OTP, mirrors partner login) ──
// Works for BOTH roles: partners (Partner + UserProfile) and admins (UserProfile
// only). Partners have no password, so this is their only way to move their login
// identity; admins get the same confirm-by-code flow for parity.

export type EmailChangeResult = { ok: true } | { error: string; retryAfterMs?: number };

/**
 * Demo sandboxes can't change their login email. The demo principal signs in with a
 * generated `demo-*@demo.claracentral.app` address that `/demo` re-verifies on every
 * visit, and `auth.users.email` is globally unique — so letting a sandbox claim a
 * real address would both break demo re-entry and collide with other demos/tenants.
 * The profile page hides the dialog (`MyProfile.isDemo`); these guards cover direct
 * server-action calls.
 */
const DEMO_EMAIL_CHANGE_ERROR = "Changing your email isn't available in the demo.";

/** The caller's current login identity (email + display name), whatever their role. */
async function getMyIdentity(
  ctx: { role: string; userId: string; organizationId: string; partnerId?: string },
): Promise<{ email: string; name: string } | null> {
  if (ctx.role === "partner") {
    if (!ctx.partnerId) return null;
    const p = await getPartnerProfile(ctx.organizationId, ctx.partnerId);
    return p ? { email: p.email, name: p.fullName } : null;
  }
  const u = await getUserProfile(ctx.userId);
  return u ? { email: u.email, name: u.fullName } : null;
}

/**
 * Is `email` already used by a DIFFERENT partner or user profile? `Partner.email`
 * has a DB unique constraint, but `UserProfile.email` does not — so we check both
 * case-insensitively, excluding the caller's own rows. Mirrors the admin
 * edit-partner uniqueness guard (src/app/actions/partners.ts). Admins have no
 * Partner row, so `partnerId` is omitted and any partner using the email counts.
 */
async function emailTakenByOther(
  email: string,
  own: { organizationId: string; partnerId?: string; userId: string },
): Promise<boolean> {
  const { partner, profile } = await emailInUse(email, {
    organizationId: own.organizationId,
    partnerId: own.partnerId,
    userId: own.userId,
  });
  return partner || profile;
}

/**
 * Change-email — step 1. Validates the new email (well-formed, different from the
 * current one, not taken by another account) and, when email delivery is enabled
 * (`NEXT_PUBLIC_PARTNER_OTP_EMAIL="true"`), triggers Supabase's native email-change
 * confirmation (`auth.updateUser({ email })`) to the NEW address. Otherwise it
 * sends nothing — the confirm screen accepts any 6 digits and the change is applied
 * at verify (see {@link verifyEmailChangeAction}), exactly as partner login works
 * today. Available to partners and admins, except in a demo org (see
 * {@link DEMO_EMAIL_CHANGE_ERROR}). Rate-limited per user + per target email.
 */
export async function requestEmailChangeAction(input: {
  email: string;
}): Promise<EmailChangeResult> {
  const ctx = await getSessionContext();
  if (ctx.role === "partner" && !ctx.partnerId) throw new Error("Forbidden");
  if (await isDemoOrg(ctx.organizationId)) return { error: DEMO_EMAIL_CHANGE_ERROR };

  const parsed = requestEmailChangeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid email." };
  }
  const newEmail = parsed.data.email.trim().toLowerCase();

  // Abuse protection: throttle per user (blunts spamming many addresses) and per
  // target email (blunts hammering one inbox).
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const userLimit = rateLimit(`email-change:user:${ctx.userId}`, { limit: 5, windowMs: 15 * 60_000 });
  const emailLimit = rateLimit(`email-change:email:${newEmail}`, { limit: 3, windowMs: 5 * 60_000 });
  const ipLimit = rateLimit(`email-change:ip:${ip}`, { limit: 15, windowMs: 15 * 60_000 });
  if (!userLimit.allowed || !emailLimit.allowed || !ipLimit.allowed) {
    // Surface the retry delay so the client keeps "Resend code" disabled for
    // exactly that long. Allowed buckets report retryAfterMs 0.
    const retryAfterMs = Math.max(userLimit.retryAfterMs, emailLimit.retryAfterMs, ipLimit.retryAfterMs);
    return { error: "Too many requests. Please wait a few minutes and try again.", retryAfterMs };
  }

  const current = await getMyIdentity(ctx);
  if (!current) throw new Error("Profile not found");
  if (newEmail === current.email.toLowerCase()) {
    return { error: "That's already your email address." };
  }
  if (await emailTakenByOther(newEmail, { organizationId: ctx.organizationId, partnerId: ctx.partnerId, userId: ctx.userId })) {
    return { error: "This email is already associated with another account." };
  }

  // Send a real confirmation code only when email delivery is configured (and not
  // in the mock). This sets a pending email change on the caller's auth user and
  // emails an `email_change` OTP to the new address, verified in step 2.
  if (partnerOtpEmailEnabled() && !isPrototypeMode()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      return { error: "Could not send a code. Please try again." };
    }
  }

  return { ok: true };
}

/**
 * Change-email — step 2. Re-checks the new email is still valid + unique, verifies
 * the code, then updates the email everywhere it must stay in sync or login breaks:
 * Supabase `auth.users`, `UserProfile.email`, and — for partners — `Partner.email`
 * too (all lower-cased). When email delivery is enabled it first verifies the real
 * `email_change` OTP (proving inbox control); otherwise (default / PROTOTYPE_MODE) it
 * accepts any 6-digit code. Either way it then finalizes the change via the admin API
 * so `auth.users` is guaranteed updated before the Prisma mirror — this survives
 * Supabase's "secure email change" double-confirmation, which otherwise leaves auth
 * unchanged while verifyOtp reports success. Available to partners and admins, except
 * in a demo org (see {@link DEMO_EMAIL_CHANGE_ERROR}). The caller's session stays
 * valid (the auth user id is unchanged).
 */
export async function verifyEmailChangeAction(input: {
  email: string;
  code: string;
}): Promise<EmailChangeResult> {
  const ctx = await getSessionContext();
  if (ctx.role === "partner" && !ctx.partnerId) throw new Error("Forbidden");
  if (await isDemoOrg(ctx.organizationId)) return { error: DEMO_EMAIL_CHANGE_ERROR };

  const parsed = verifyEmailChangeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter the 6-digit code." };
  }
  const newEmail = parsed.data.email.trim().toLowerCase();

  const current = await getMyIdentity(ctx);
  if (!current) throw new Error("Profile not found");
  const oldEmail = current.email;
  if (newEmail === oldEmail.toLowerCase()) {
    return { error: "That's already your email address." };
  }
  if (await emailTakenByOther(newEmail, { organizationId: ctx.organizationId, partnerId: ctx.partnerId, userId: ctx.userId })) {
    return { error: "This email is already associated with another account." };
  }

  if (partnerOtpEmailEnabled() && !isPrototypeMode()) {
    // Real emailed OTP: verify the genuine code sent to the new address first — this
    // proves the caller controls that inbox before we touch anything.
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email: newEmail,
      token: parsed.data.code,
      type: "email_change",
    });
    if (error || !data.user) {
      return { error: "That code is invalid or has expired. Please try again." };
    }
  }

  // Apply the new email to the auth user via the admin API. On the mock path this is
  // the sole apply step (any 6 digits, already format-validated). On the real path it
  // FINALIZES the change: with Supabase "secure email change" (double confirmation)
  // enabled, verifying only the new address leaves auth.users.email unchanged
  // (email_change_confirm_status 1, not 2) yet verifyOtp still returns success — so
  // forcing it here guarantees auth.users matches before we mirror to Prisma below.
  // Skip it and the rows desync from auth, breaking partner login (which resolves
  // Partner.email → auth) and locking the partner out.
  const admin = createAdminClient();
  const { error: applyError } = await admin.auth.admin.updateUserById(ctx.userId, {
    email: newEmail,
    email_confirm: true,
  });
  if (applyError) {
    return { error: "Could not update your email. Please try again." };
  }

  // Mirror the new email onto the Prisma rows so login and the account identity stay
  // consistent with auth. Partners have both a Partner row (login looks up
  // Partner.email) and a UserProfile; admins have only a UserProfile.
  if (ctx.role === "partner" && ctx.partnerId) {
    await prisma.$transaction([
      prisma.partner.update({ where: { id: ctx.partnerId }, data: { email: newEmail } }),
      prisma.userProfile.update({ where: { id: ctx.userId }, data: { email: newEmail } }),
    ]);
  } else {
    await prisma.userProfile.update({ where: { id: ctx.userId }, data: { email: newEmail } });
  }

  await logActivity({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "updated",
    entityType: ctx.role === "partner" ? "partner" : "user",
    entityId: ctx.role === "partner" && ctx.partnerId ? ctx.partnerId : ctx.userId,
    entityName: current.name,
    changes: { email: { from: oldEmail, to: newEmail } },
  }).catch(() => {});

  return { ok: true };
}
