"use server";

import type { partner_status } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/actions/auth-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { provisionPartnerAuthUser } from "@/lib/supabase/partner-auth";
import {
  approveSelfSignupPartner,
  deletePartner,
  emailInUse,
  getPartnerDetail,
  listPartners,
  setPartnerStatus,
  updatePartner,
  updatePartnerAvatar,
  type PartnerDetail,
} from "@/lib/services/partner-service";
import {
  avatarPublicUrl,
  createAvatarUploadUrl,
  pruneAvatarObjects,
} from "@/lib/supabase/avatar-storage";
import {
  AccountExistsError,
  ActiveInviteExistsError,
  createPartnerInvite,
  listActiveInvites,
  PartnerExistsError,
  resendInvite,
  revokeInvite,
  type InviteListRow,
} from "@/lib/services/invite-service";
import {
  notifyPartnerApproved,
  notifyPartnerInvited,
  notifyPartnerRejected,
} from "@/lib/notifications";
import { diffChanges, logActivity, snapshot } from "@/lib/services/activity-service";
import { resolveOrigin } from "@/lib/site-url";
import { invitePartnerSchema, prepareAvatarUploadSchema, updatePartnerSchema } from "@/lib/validations/partner";
import { fileExtension, validateCoverImage } from "@/lib/validations/marketing";

/** Admin-only: every partner with derived commission aggregates. */
export async function getPartnersAction() {
  const ctx = await getSessionContext();
  if (ctx.role !== "admin") throw new Error("Forbidden");
  return listPartners(ctx.organizationId);
}

/** Admin-only: a single partner's full detail, or null if not found. */
export async function getPartnerAction(id: string) {
  const ctx = await getSessionContext();
  if (ctx.role !== "admin") throw new Error("Forbidden");
  return getPartnerDetail(ctx.organizationId, id);
}

export type UpdatePartnerResult =
  | { partner: PartnerDetail }
  | { error: string; field?: "email" };

/** Trim a string; empty becomes null (for nullable text columns). */
function orNull(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Admin-only: update a partner's details (incl. the single commission rate
 * that applies to all their referrals). Returns the refreshed detail, or an
 * `{ error }` for validation / duplicate-email failures.
 */
export async function updatePartnerAction(
  id: string,
  input: unknown,
): Promise<UpdatePartnerResult> {
  const ctx = await getSessionContext();
  if (ctx.role !== "admin") throw new Error("Forbidden");

  const parsed = updatePartnerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid partner details" };
  }
  const d = parsed.data;
  const email = d.email.trim();

  // Email must be unique across BOTH partners and user profiles. `Partner.email` has
  // a DB unique constraint (caught below), but `UserProfile.email` does not — so check
  // explicitly, case-insensitively, excluding this partner's own rows. We also grab the
  // current field values here to build the audit diff (AUD-1).
  const before = await prisma.partner.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: {
      userId: true,
      fullName: true,
      email: true,
      phone: true,
      companyName: true,
      role: true,
      location: true,
      website: true,
      commissionRate: true,
    },
  });
  const { partner: emailPartner, profile: emailProfile } = await emailInUse(email, {
    organizationId: ctx.organizationId,
    partnerId: id,
    userId: before?.userId ?? undefined,
  });
  if (emailPartner || emailProfile) {
    return { error: "This email is already associated with another account.", field: "email" };
  }

  const updates = {
    fullName: d.fullName.trim(),
    email: d.email.trim(),
    phone: orNull(d.phone),
    companyName: orNull(d.companyName),
    role: orNull(d.role),
    location: orNull(d.location),
    website: orNull(d.website),
    commissionRate: d.commissionRate,
  };

  try {
    const partner = await updatePartner(ctx.organizationId, id, updates);
    if (!partner) return { error: "Partner not found" };

    await logActivity({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "updated",
      entityType: "partner",
      entityId: id,
      entityName: partner.fullName,
      changes: before ? diffChanges(before, updates, Object.keys(updates)) : null,
    }).catch(() => {});

    return { partner };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "This email is already associated with another account.", field: "email" };
    }
    throw e;
  }
}

// ── Admin: partner avatar (moderation — upload/replace/remove a partner's photo) ──

export type PrepareAvatarUploadResult = { path: string; token: string } | { error: string };
export type AvatarResult = { ok: true; avatarUrl: string | null } | { error: string };

/**
 * True when `partnerId` belongs to `organizationId`. Gates the avatar storage
 * actions: `updatePartnerAvatar` is already org-scoped (no-ops for a foreign
 * partner), but the signed-upload URL + `pruneAvatarObjects` touch the shared
 * `avatars` bucket under `${partnerId}/…`, so a foreign id must be rejected
 * BEFORE any storage call.
 */
async function partnerInOrg(partnerId: string, organizationId: string): Promise<boolean> {
  const owned = await prisma.partner.findFirst({
    where: { id: partnerId, organizationId },
    select: { id: true },
  });
  return Boolean(owned);
}

/** Admin-only step 1: mint a signed upload URL for a partner's profile picture. */
export async function preparePartnerAvatarUploadAction(
  partnerId: string,
  input: unknown,
): Promise<PrepareAvatarUploadResult> {
  const ctx = await getSessionContext();
  if (ctx.role !== "admin") throw new Error("Forbidden");
  if (!(await partnerInOrg(partnerId, ctx.organizationId))) return { error: "Partner not found" };

  const parsed = prepareAvatarUploadSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid upload request" };
  const check = validateCoverImage({ name: parsed.data.fileName, size: parsed.data.size });
  if (!check.ok) return { error: check.error };

  const path = `${partnerId}/${crypto.randomUUID()}.${fileExtension(parsed.data.fileName)}`;
  try {
    const { path: storedPath, token } = await createAvatarUploadUrl(path);
    return { path: storedPath, token };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not start the upload" };
  }
}

/** Admin-only step 3: persist an uploaded picture's public URL onto the partner. */
export async function setPartnerAvatarAction(
  partnerId: string,
  path: string,
): Promise<AvatarResult> {
  const ctx = await getSessionContext();
  if (ctx.role !== "admin") throw new Error("Forbidden");
  if (!(await partnerInOrg(partnerId, ctx.organizationId))) return { error: "Partner not found" };
  if (typeof path !== "string" || !path.startsWith(`${partnerId}/`)) {
    return { error: "Invalid file path" };
  }

  try {
    const url = avatarPublicUrl(path);
    await updatePartnerAvatar(ctx.organizationId, partnerId, url);
    await pruneAvatarObjects(partnerId, path).catch(() => {});
    await logActivity({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "updated",
      entityType: "partner",
      entityId: partnerId,
      entityName: "profile picture",
      changes: { avatarUrl: { to: url } },
    }).catch(() => {});
    return { ok: true, avatarUrl: url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save the picture" };
  }
}

/** Admin-only: clear a partner's profile picture and purge their avatar blobs. */
export async function removePartnerAvatarAction(partnerId: string): Promise<AvatarResult> {
  const ctx = await getSessionContext();
  if (ctx.role !== "admin") throw new Error("Forbidden");
  if (!(await partnerInOrg(partnerId, ctx.organizationId))) return { error: "Partner not found" };

  await updatePartnerAvatar(ctx.organizationId, partnerId, null);
  await pruneAvatarObjects(partnerId).catch(() => {});
  await logActivity({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "updated",
    entityType: "partner",
    entityId: partnerId,
    entityName: "profile picture",
    changes: { avatarUrl: { to: null } },
  }).catch(() => {});
  return { ok: true, avatarUrl: null };
}

export type InvitePartnerResult =
  | { link: string; email: string; emailed: boolean; expiresAt: string | null }
  | { error: string };

/**
 * Admin-only: create a pending invitation and return its onboarding link + expiry.
 * The email is normalized + checked against existing partners and active invites.
 * Full name is optional. The invite email is sent best-effort; the dialog also shows
 * the copyable link as a fallback.
 */
export async function invitePartnerAction(input: unknown): Promise<InvitePartnerResult> {
  const ctx = await getSessionContext();
  if (ctx.role !== "admin") throw new Error("Forbidden");

  const parsed = invitePartnerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid invitation details" };
  }
  const d = parsed.data;
  const email = d.email.trim().toLowerCase();
  const fullName = orNull(d.fullName);

  let invite;
  try {
    invite = await createPartnerInvite(
      ctx.organizationId,
      {
        fullName,
        email,
        companyName: orNull(d.companyName),
        location: orNull(d.location),
        website: orNull(d.website),
        commissionRate: d.commissionRate,
      },
      ctx.userId,
    );
  } catch (e) {
    if (
      e instanceof PartnerExistsError ||
      e instanceof ActiveInviteExistsError ||
      e instanceof AccountExistsError
    ) {
      return { error: e.message };
    }
    throw e;
  }

  const link = `${await resolveOrigin()}/invite/${invite.token}`;

  // Best-effort email: a failure must NOT fail invite creation — the invite row
  // is the source of truth and the admin still gets the copyable link. `emailed`
  // lets the dialog tell the truth about whether the email went out.
  const emailed = await notifyPartnerInvited({
    organizationId: ctx.organizationId,
    to: email,
    fullName: fullName ?? "",
    link,
  });

  await logActivity({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "created",
    entityType: "partner_invite",
    entityId: invite.id,
    entityName: email,
    changes: {
      email,
      commissionRate: d.commissionRate,
      expiresAt: invite.expiresAt ? invite.expiresAt.toISOString() : null,
    },
  }).catch(() => {});

  return { link, email, emailed, expiresAt: invite.expiresAt ? invite.expiresAt.toISOString() : null };
}

/** Admin-only: outstanding (pending) partner invitations for the Invitations section. */
export async function getInvitesAction(): Promise<InviteListRow[]> {
  const ctx = await getSessionContext();
  if (ctx.role !== "admin") throw new Error("Forbidden");
  return listActiveInvites(ctx.organizationId);
}

/**
 * Admin-only: revoke a pending invitation. Frees the email for a fresh invite or
 * self-signup and drops it from the Invitations section.
 */
export async function revokeInviteAction(
  inviteId: string,
): Promise<{ ok: true } | { error: string }> {
  const ctx = await getSessionContext();
  if (ctx.role !== "admin") throw new Error("Forbidden");

  const res = await revokeInvite(ctx.organizationId, inviteId);
  if (!res) return { error: "Invitation not found" };

  if (res.previousStatus === "pending") {
    await logActivity({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "status_changed",
      entityType: "partner_invite",
      entityId: inviteId,
      entityName: res.email,
      changes: { status: { from: "pending", to: "revoked" } },
    }).catch(() => {});
  }
  return { ok: true };
}

/**
 * Admin-only: resend a pending invitation — refresh its expiry (keeping the same
 * token) and re-send the invite email (best-effort). Returns the refreshed link +
 * expiry so the dialog can show them.
 */
export async function resendInviteAction(
  inviteId: string,
): Promise<{ link: string; email: string; emailed: boolean; expiresAt: string } | { error: string }> {
  const ctx = await getSessionContext();
  if (ctx.role !== "admin") throw new Error("Forbidden");

  const res = await resendInvite(ctx.organizationId, inviteId);
  if (!res) return { error: "This invitation can no longer be resent." };

  const link = `${await resolveOrigin()}/invite/${res.token}`;
  const emailed = await notifyPartnerInvited({
    organizationId: ctx.organizationId,
    to: res.email,
    fullName: res.fullName ?? "",
    link,
  });

  await logActivity({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "updated",
    entityType: "partner_invite",
    entityId: inviteId,
    entityName: res.email,
    changes: { resent: true, expiresAt: res.expiresAt.toISOString() },
  }).catch(() => {});

  return { link, email: res.email, emailed, expiresAt: res.expiresAt.toISOString() };
}

/**
 * Admin-only: approve or reject a partner (from the list Actions column).
 *
 * Approving a self-signup applicant that has no auth user yet provisions one
 * (Supabase auth user + UserProfile, role partner) and links it — so the partner
 * can then sign in via OTP. Invited partners already have an auth user, so we
 * just flip their status. Rejecting only sets the status.
 */
export async function setPartnerStatusAction(
  id: string,
  status: Extract<partner_status, "approved" | "rejected">,
): Promise<{ ok: true } | { error: string }> {
  const ctx = await getSessionContext();
  if (ctx.role !== "admin") throw new Error("Forbidden");

  const partner = await prisma.partner.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { email: true, fullName: true, userId: true, status: true },
  });
  if (!partner) return { error: "Partner not found" };

  // Idempotent: already in the target state → no-op (no duplicate auth user, no log).
  if (partner.status === status) return { ok: true };

  // Spec precondition: approve/reject act on a pending application only. A partner
  // that's already approved or rejected can't be flipped via this action.
  if (partner.status !== "pending") {
    return { error: "This partner has already been reviewed." };
  }

  if (status === "rejected") {
    await setPartnerStatus(ctx.organizationId, id, "rejected");
    // Best-effort: let the applicant know the outcome; a send failure never blocks.
    await notifyPartnerRejected({
      organizationId: ctx.organizationId,
      to: partner.email,
      fullName: partner.fullName,
    });
    await logActivity({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "rejected",
      entityType: "partner",
      entityId: id,
      entityName: partner.email,
      changes: { status: { from: partner.status, to: "rejected" } },
    }).catch(() => {});
    return { ok: true };
  }

  // Already has an auth user (invited, or previously provisioned) → just approve.
  if (partner.userId) {
    await setPartnerStatus(ctx.organizationId, id, "approved");
    await logActivity({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "approved",
      entityType: "partner",
      entityId: id,
      entityName: partner.email,
      changes: { status: { from: partner.status, to: "approved" } },
    }).catch(() => {});
    return { ok: true };
  }

  // Guard: don't create a partner login on an email that already belongs to
  // another account (e.g. an admin). Catches applications that predate the
  // intake check, or an admin created after this application was submitted.
  const inUse = await emailInUse(partner.email, { organizationId: ctx.organizationId });
  if (inUse.profile) {
    return { error: "This email is already associated with an existing account." };
  }

  // Self-signup applicant: provision the auth user (role partner, OTP-only) — or
  // reclaim an orphaned one for this email (e.g. left behind by a reseed) — then
  // link + approve. Roll back the auth user if the DB writes fail.
  const admin = createAdminClient();
  const provisioned = await provisionPartnerAuthUser(admin, {
    email: partner.email,
    fullName: partner.fullName,
  });
  if ("conflict" in provisioned) {
    return { error: "Couldn't create the partner's login — they may already have an account." };
  }
  const userId = provisioned.userId;

  try {
    await approveSelfSignupPartner(ctx.organizationId, id, userId, partner.email, partner.fullName);
  } catch (e) {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "This partner is already linked to an account." };
    }
    return { error: "Couldn't approve the partner. Please try again." };
  }

  // Best-effort: tell the partner they're approved and can sign in. Awaited so
  // the send completes before the serverless function returns; never throws.
  await notifyPartnerApproved({
    organizationId: ctx.organizationId,
    to: partner.email,
    fullName: partner.fullName,
    loginUrl: `${await resolveOrigin()}/partner/login`,
  });

  await logActivity({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "approved",
    entityType: "partner",
    entityId: id,
    entityName: partner.email,
    changes: { status: { from: partner.status, to: "approved" } },
  }).catch(() => {});

  return { ok: true };
}

/**
 * Admin-only: permanently delete a partner and everything attached to them. The
 * partner row's deletion cascades to their referrals, those referrals' invoices,
 * and all their payouts (DB-level `onDelete: Cascade`). The linked auth user is
 * also torn down — best-effort — so a deleted partner can no longer sign in:
 * the Supabase auth user via the service-role admin API, and the `UserProfile`
 * row via Prisma. Both are best-effort because the partner (the source of truth)
 * is already gone; a teardown failure must not surface as a failed delete. Writes
 * a `deleted` audit entry with a snapshot of what was removed.
 */
export async function deletePartnerAction(
  id: string,
): Promise<{ ok: true } | { error: string }> {
  const ctx = await getSessionContext();
  if (ctx.role !== "admin") throw new Error("Forbidden");

  const deleted = await deletePartner(ctx.organizationId, id);
  if (!deleted) return { error: "Partner not found" };

  const { userId, ...auditFields } = deleted;
  // Tear down the login so the partner can't authenticate after deletion. Remove
  // the `UserProfile` row first so any FK from auth.users → user_profiles can't
  // block the auth-user deletion, then delete the Supabase auth user. Both are
  // best-effort: the partner (source of truth) is already gone, so a teardown
  // failure must not surface as a failed delete.
  if (userId) {
    const admin = createAdminClient();
    await prisma.userProfile.delete({ where: { id: userId } }).catch(() => {});
    await admin.auth.admin.deleteUser(userId).catch(() => {});
  }

  await logActivity({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "deleted",
    entityType: "partner",
    entityId: id,
    entityName: deleted.fullName,
    changes: { deletedRecord: snapshot(auditFields) },
  }).catch(() => {});

  return { ok: true };
}
