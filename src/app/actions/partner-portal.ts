"use server";

import { getSessionContext } from "@/lib/actions/auth-context";
import { getPartnerSummary } from "@/lib/services/partner-service";
import {
  createReferral,
  deletePartnerReferral,
  getPartnerReferralDetail,
  listPartnerReferrals,
} from "@/lib/services/referral-service";
import { listPartnerPayouts } from "@/lib/services/payout-service";
import { logActivity, snapshot } from "@/lib/services/activity-service";
import { notifyAdminNewReferral } from "@/lib/notifications";
import { resolveOrigin } from "@/lib/site-url";
import { referContactSchema } from "@/lib/validations/referral";

/**
 * Resolve the partner session, or throw. Mirrors `requireAdmin` in the admin
 * actions: every partner-portal read/write is scoped to the caller's own
 * `partnerId` (never another partner's data).
 */
async function requirePartner() {
  const ctx = await getSessionContext();
  if (ctx.role !== "partner" || !ctx.partnerId) throw new Error("Forbidden");
  return ctx as { userId: string; role: "partner"; organizationId: string; partnerId: string };
}

/** Partner-only: the signed-in partner's own referrals. */
export async function getMyReferralsAction() {
  const ctx = await requirePartner();
  return listPartnerReferrals(ctx.organizationId, ctx.partnerId);
}

/**
 * Partner-only: one of the signed-in partner's own referrals, by id. Scoped to the
 * caller's `partnerId` — returns null for any referral they don't own. The returned
 * view-model carries no admin-private fields.
 */
export async function getMyReferralAction(referralId: string) {
  const ctx = await requirePartner();
  return getPartnerReferralDetail(ctx.organizationId, ctx.partnerId, referralId);
}

/** Partner-only: the signed-in partner's own payouts. */
export async function getMyPayoutsAction() {
  const ctx = await requirePartner();
  return listPartnerPayouts(ctx.organizationId, ctx.partnerId);
}

/** Partner-only: the signed-in partner's name + commission rate (header/forms). */
export async function getMyPartnerSummaryAction() {
  const ctx = await requirePartner();
  return getPartnerSummary(ctx.organizationId, ctx.partnerId);
}

export type CreateReferralResult = { id: string } | { error: string };

/** Partner-only: submit a new referral the partner is referring. */
export async function createReferralAction(input: unknown): Promise<CreateReferralResult> {
  const ctx = await requirePartner();
  const parsed = referContactSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid referral details" };
  }
  const d = parsed.data;
  const { id } = await createReferral(ctx.organizationId, ctx.partnerId, {
    contactName: d.contactName,
    contactEmail: d.contactEmail || null,
    contactCompany: d.contactCompany || null,
    contactPhone: d.contactPhone || null,
    contactWebsite: d.contactWebsite || null,
    notes: d.notes || null,
  });
  await logActivity({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "created",
    entityType: "referral",
    entityId: id,
    entityName: d.contactName,
    changes: {
      contactName: d.contactName,
      contactEmail: d.contactEmail || null,
      contactCompany: d.contactCompany || null,
      contactPhone: d.contactPhone || null,
      contactWebsite: d.contactWebsite || null,
      status: "submitted",
    },
  }).catch(() => {});

  // Best-effort: alert admins a new referral entered the system (partner already
  // knows — they just submitted it, so no partner-facing notification here).
  await notifyAdminNewReferral({
    organizationId: ctx.organizationId,
    partnerId: ctx.partnerId,
    contactName: d.contactName,
    referralUrl: `${await resolveOrigin()}/admin/referrals/${id}`,
  }).catch(() => {});

  return { id };
}

/**
 * Partner-only: delete one of the signed-in partner's own referrals while it's
 * still in the `submitted` stage. Ownership + status are enforced in the service;
 * a not-found / not-owned referral returns the same generic message (never leaks
 * ownership). Logs a `deleted` audit entry with a snapshot, matching the admin path.
 */
export async function deleteMyReferralAction(
  referralId: string,
): Promise<{ ok: true } | { error: string }> {
  const ctx = await requirePartner();
  const res = await deletePartnerReferral(ctx.organizationId, ctx.partnerId, referralId);
  if (!res.ok) {
    if (res.reason === "not_submitted") {
      return { error: "Only referrals still in the Submitted stage can be deleted." };
    }
    return { error: "Referral not found." };
  }

  await logActivity({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "deleted",
    entityType: "referral",
    entityId: referralId,
    entityName: res.deleted.contactName,
    changes: { deletedRecord: snapshot(res.deleted) },
  }).catch(() => {});

  return { ok: true };
}
