"use server";

import { getSessionContext } from "@/lib/actions/auth-context";
import { diffChanges, logActivity, snapshot } from "@/lib/services/activity-service";
import {
  type CommissionSummary,
  deletePayout,
  getPayoutsSummary,
  listPayouts,
  recordPayout,
  updatePayout,
  type PayoutListRow,
} from "@/lib/services/payout-service";
import { notifyPayoutRecorded } from "@/lib/notifications";
import { resolveOrigin } from "@/lib/site-url";
import { recordPayoutSchema } from "@/lib/validations/payout";

/** Admin-only: every payout across all partners for the admin Payouts list. */
export async function getPayoutsAction(): Promise<PayoutListRow[]> {
  const ctx = await getSessionContext();
  if (ctx.role !== "admin") throw new Error("Forbidden");
  return listPayouts(ctx.organizationId);
}

/** Admin-only: platform-wide commission earned / paid / outstanding for the Payouts KPIs. */
export async function getPayoutsSummaryAction(): Promise<CommissionSummary> {
  const ctx = await getSessionContext();
  if (ctx.role !== "admin") throw new Error("Forbidden");
  return getPayoutsSummary(ctx.organizationId);
}

export type RecordPayoutResult = { ok: true } | { error: string };

/**
 * Admin-only: record a commission payout to a partner. `referralId` is set for a
 * referral-level payment, null for a partner-level payout. Per the commission-engine
 * spec there is no owed cap — over-paying is allowed (the dialog shows a soft warning).
 */
export async function recordPayoutAction(
  partnerId: string,
  referralId: string | null,
  input: unknown,
): Promise<RecordPayoutResult> {
  const ctx = await getSessionContext();
  if (ctx.role !== "admin") throw new Error("Forbidden");

  const parsed = recordPayoutSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid payout details" };
  }
  const d = parsed.data;

  const result = await recordPayout(ctx.organizationId, {
    partnerId,
    referralId,
    amount: d.amount,
    publicNote: d.publicNote?.trim() || null,
    privateNote: d.privateNote?.trim() || null,
  });
  if (!result) return { error: "Partner not found" };

  // Best-effort: tell the partner a payout landed (email + SMS per their prefs);
  // a send failure never blocks.
  await notifyPayoutRecorded({
    organizationId: ctx.organizationId,
    partnerId,
    amount: d.amount,
    note: d.publicNote?.trim() || null,
    earningsUrl: `${await resolveOrigin()}/partner/payouts`,
  });

  await logActivity({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "payout_recorded",
    entityType: "payout",
    entityId: result.id,
    entityName: result.partnerName,
    changes: { amount: d.amount, partnerId, referralId },
  }).catch(() => {});

  return { ok: true };
}

/** Admin-only: edit an existing payout's amount/notes (no owed cap — soft warning in UI). */
export async function updatePayoutAction(
  payoutId: string,
  input: unknown,
): Promise<RecordPayoutResult> {
  const ctx = await getSessionContext();
  if (ctx.role !== "admin") throw new Error("Forbidden");

  const parsed = recordPayoutSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid payout details" };
  }
  const d = parsed.data;

  const result = await updatePayout(ctx.organizationId, payoutId, {
    amount: d.amount,
    publicNote: d.publicNote?.trim() || null,
    privateNote: d.privateNote?.trim() || null,
  });
  if (!result) return { error: "Payout not found" };

  await logActivity({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "updated",
    entityType: "payout",
    entityId: payoutId,
    entityName: result.partnerName,
    changes: diffChanges(result.before, {
      amount: d.amount,
      publicNote: d.publicNote?.trim() || null,
      privateNote: d.privateNote?.trim() || null,
    }),
  }).catch(() => {});

  return { ok: true };
}

/** Admin-only: delete a payout (returns the freed amount to the partner's owed balance). */
export async function deletePayoutAction(payoutId: string): Promise<RecordPayoutResult> {
  const ctx = await getSessionContext();
  if (ctx.role !== "admin") throw new Error("Forbidden");

  const result = await deletePayout(ctx.organizationId, payoutId);
  if (!result) return { error: "Payout not found" };

  await logActivity({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "deleted",
    entityType: "payout",
    entityId: payoutId,
    entityName: result.partnerName,
    changes: { deletedRecord: snapshot(result.deleted) },
  }).catch(() => {});

  return { ok: true };
}
