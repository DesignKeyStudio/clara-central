"use server";

import type { invoice_status, referral_status } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/actions/auth-context";
import {
  createInvoice,
  createReferral,
  deleteInvoice,
  deleteReferral,
  getReferralDetail,
  listReferrals,
  setContractEnded,
  setInvoiceStatus,
  updateInvoice,
  updateReferralStatus,
  type ReferralDetail,
} from "@/lib/services/referral-service";
import { getPartnerByReferralCode } from "@/lib/services/partner-service";
import { diffChanges, logActivity, snapshot } from "@/lib/services/activity-service";
import {
  notifyAdminNewReferral,
  notifyInvoiceIssued,
  notifyNewLead,
  notifyReferralStatusChanged,
} from "@/lib/notifications";
import { resolveOrigin } from "@/lib/site-url";
import { referralStatusMeta } from "@/lib/status-meta";
import { createInvoiceSchema, referContactSchema } from "@/lib/validations/referral";

/**
 * Referral statuses worth notifying the owning partner about — every pipeline
 * transition. `submitted` is the sole exclusion: it is the initial state (never a
 * transition target here) and its own arrival is announced via `notifyNewLead`.
 */
const NOTIFY_STATUSES = new Set<referral_status>([
  "contacted",
  "meeting_scheduled",
  "proposal_sent",
  "negotiating",
  "deal_closed",
  "no_response",
  "not_qualified",
  "lost",
]);

/** Admin-only: every referral across all partners for the admin Referrals list. */
export async function getReferralsAction() {
  const ctx = await getSessionContext();
  if (ctx.role !== "admin") throw new Error("Forbidden");
  return listReferrals(ctx.organizationId);
}

/** Admin-only: a single referral's full detail, or null when not found. */
export async function getReferralAction(id: string) {
  const ctx = await getSessionContext();
  if (ctx.role !== "admin") throw new Error("Forbidden");
  return getReferralDetail(ctx.organizationId, id);
}

export type ReferralResult = { referral: ReferralDetail } | { error: string };

export type PublicReferralResult = { ok: true } | { error: string };

/**
 * PUBLIC (unauthenticated): capture a lead from a partner's shareable referral
 * link (`/r/[code]`). Resolves the partner by referral code — only an APPROVED
 * partner's link captures leads — validates the payload with the same
 * `referContactSchema` the partner "Refer a contact" form uses, and creates a
 * `submitted` referral attributed to that partner. Best-effort: writes a `created`
 * audit entry (no actor) and notifies the partner their link produced a lead. A
 * missing or non-approved code returns a single "unavailable" message so the code
 * never reveals a pending/rejected partner's existence.
 */
export async function createReferralFromLink(
  code: string,
  input: unknown,
): Promise<PublicReferralResult> {
  const partner = await getPartnerByReferralCode(code);
  if (!partner || partner.status !== "approved") {
    return { error: "This referral link is unavailable." };
  }

  const parsed = referContactSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please complete the required fields." };
  }
  const d = parsed.data;

  // Org derived from the (globally-unique) referral code's partner — the public
  // caller has no session/org of its own.
  const { id } = await createReferral(partner.organizationId, partner.id, {
    contactName: d.contactName,
    contactEmail: d.contactEmail || null,
    contactCompany: d.contactCompany || null,
    contactPhone: d.contactPhone || null,
    contactWebsite: d.contactWebsite || null,
    notes: d.notes || null,
  });

  await logActivity({
    organizationId: partner.organizationId,
    userId: null,
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
      source: "referral_link",
    },
  }).catch(() => {});

  // Best-effort: tell the partner their link produced a lead (email + SMS per
  // prefs) and alert admins that a new referral entered the system.
  const origin = await resolveOrigin();
  await notifyNewLead({
    organizationId: partner.organizationId,
    partnerId: partner.id,
    contactName: d.contactName,
    referralUrl: `${origin}/partner/referrals/${id}`,
  }).catch(() => {});
  await notifyAdminNewReferral({
    organizationId: partner.organizationId,
    partnerId: partner.id,
    contactName: d.contactName,
    referralUrl: `${origin}/admin/referrals/${id}`,
  }).catch(() => {});

  return { ok: true };
}

async function requireAdmin() {
  const ctx = await getSessionContext();
  if (ctx.role !== "admin") throw new Error("Forbidden");
  return ctx;
}

/** Admin-only: move a referral to a new pipeline status. */
export async function updateReferralStatusAction(
  id: string,
  status: referral_status,
): Promise<ReferralResult> {
  const ctx = await requireAdmin();
  const before = await prisma.referral.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { status: true },
  });
  const referral = await updateReferralStatus(ctx.organizationId, id, status);
  if (!referral) return { error: "Referral not found" };

  // Best-effort: notify the partner only on a real transition into a notable status.
  if (before?.status !== status && NOTIFY_STATUSES.has(status)) {
    await notifyReferralStatusChanged({
      organizationId: ctx.organizationId,
      referralId: id,
      contactName: referral.contactName,
      statusLabel: referralStatusMeta(status).label,
      referralUrl: `${await resolveOrigin()}/partner/referrals/${id}`,
    }).catch(() => {});
  }

  await logActivity({
    userId: ctx.userId,
    action: "status_changed",
    entityType: "referral",
    entityId: id,
    entityName: referral.contactName,
    changes: { status: { from: before?.status ?? null, to: status } },
    organizationId: ctx.organizationId,
  }).catch(() => {});
  return { referral };
}

/** Admin-only: close the commission window early (today) or reopen it. */
export async function setContractEndedAction(
  id: string,
  ended: boolean,
  endedDate?: string,
): Promise<ReferralResult> {
  const ctx = await requireAdmin();
  const before = await prisma.referral.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { contractEndedAt: true },
  });
  const referral = await setContractEnded(ctx.organizationId, id, ended, endedDate);
  if (!referral) return { error: "Referral not found" };
  await logActivity({
    userId: ctx.userId,
    action: "updated",
    entityType: "referral",
    entityId: id,
    entityName: referral.contactName,
    changes: { contractEnded: { from: Boolean(before?.contractEndedAt), to: ended } },
    organizationId: ctx.organizationId,
  }).catch(() => {});
  return { referral };
}

/** Admin-only: create a client invoice on a referral. */
export async function addInvoiceAction(
  referralId: string,
  input: unknown,
): Promise<ReferralResult> {
  const ctx = await requireAdmin();
  const parsed = createInvoiceSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid invoice details" };
  }
  const d = parsed.data;
  try {
    const referral = await createInvoice(ctx.organizationId, referralId, {
      invoiceNumber: d.invoiceNumber ?? null,
      amount: d.amount,
      status: d.status,
      issuedDate: new Date(d.issuedDate),
      paidDate: d.paidDate ? new Date(d.paidDate) : null,
      publicNote: d.publicNote ?? null,
      privateNote: d.privateNote ?? null,
    });
    if (!referral) return { error: "Referral not found" };

    // Best-effort: notify the partner a new invoice was raised on their referral
    // (email + SMS per prefs). The number may have been auto-generated, so read it
    // back from the newest row.
    const created = await prisma.invoice
      .findFirst({
        where: { referralId, organizationId: ctx.organizationId },
        orderBy: { createdAt: "desc" },
        select: { number: true },
      })
      .catch(() => null);
    await notifyInvoiceIssued({
      organizationId: ctx.organizationId,
      referralId,
      contactName: referral.contactName,
      invoiceNumber: created?.number ?? d.invoiceNumber?.trim() ?? "",
      amount: d.amount,
      referralUrl: `${await resolveOrigin()}/partner/referrals/${referralId}`,
    }).catch(() => {});

    await logActivity({
      userId: ctx.userId,
      action: "created",
      entityType: "invoice",
      entityId: referralId,
      entityName: d.invoiceNumber?.trim() || referral.contactName,
      changes: {
        invoiceNumber: d.invoiceNumber?.trim() || null,
        amount: d.amount,
        status: d.status,
        issuedDate: d.issuedDate,
        paidDate: d.paidDate ?? null,
      },
      organizationId: ctx.organizationId,
    }).catch(() => {});
    return { referral };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "That invoice ID already exists." };
    }
    throw e;
  }
}

/** Admin-only: change an existing invoice's status (syncs the paid date). */
export async function setInvoiceStatusAction(
  invoiceId: string,
  status: invoice_status,
  paidDate?: string,
): Promise<ReferralResult> {
  const ctx = await requireAdmin();
  const before = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId: ctx.organizationId },
    select: { number: true, status: true, paidDate: true },
  });
  const referral = await setInvoiceStatus(
    ctx.organizationId,
    invoiceId,
    status,
    paidDate ? new Date(paidDate) : null,
  );
  if (!referral) return { error: "Invoice not found" };
  const after = referral.invoices.find((inv) => inv.invoiceId === invoiceId);
  await logActivity({
    userId: ctx.userId,
    action: status === "paid" ? "invoice_paid" : "updated",
    entityType: "invoice",
    entityId: invoiceId,
    entityName: before?.number ?? referral.contactName,
    changes: {
      status: { from: before?.status ?? null, to: status },
      paidDate: { from: before?.paidDate ?? null, to: after?.paidDate ?? null },
    },
    organizationId: ctx.organizationId,
  }).catch(() => {});
  return { referral };
}

/**
 * Admin-only: edit an existing invoice (amount, issued/paid dates, notes). The
 * invoice number and status are immutable here — the number never changes on
 * edit, and status is owned by the inline status control (setInvoiceStatusAction).
 * Both are preserved from the stored row regardless of what the client sends.
 */
export async function updateInvoiceAction(
  invoiceId: string,
  input: unknown,
): Promise<ReferralResult> {
  const ctx = await requireAdmin();
  const parsed = createInvoiceSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid invoice details" };
  }
  const d = parsed.data;
  const before = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId: ctx.organizationId },
    select: {
      number: true,
      amount: true,
      status: true,
      issuedDate: true,
      paidDate: true,
      publicNote: true,
      privateNote: true,
    },
  });
  // Number + status are immutable on edit; preserve the stored values.
  const keepStatus = before?.status ?? d.status;
  const referral = await updateInvoice(ctx.organizationId, invoiceId, {
    invoiceNumber: null,
    amount: d.amount,
    status: keepStatus,
    issuedDate: new Date(d.issuedDate),
    paidDate: d.paidDate ? new Date(d.paidDate) : null,
    publicNote: d.publicNote ?? null,
    privateNote: d.privateNote ?? null,
  });
  if (!referral) return { error: "Invoice not found" };
  // Mirror the service's write so the diff reflects what was actually stored.
  const after = {
    number: before?.number,
    amount: d.amount,
    status: keepStatus,
    issuedDate: new Date(d.issuedDate),
    paidDate:
      keepStatus === "paid"
        ? d.paidDate
          ? new Date(d.paidDate)
          : new Date(d.issuedDate)
        : null,
    publicNote: d.publicNote ?? null,
    privateNote: d.privateNote ?? null,
  };
  await logActivity({
    userId: ctx.userId,
    action: "updated",
    entityType: "invoice",
    entityId: invoiceId,
    entityName: before?.number ?? referral.contactName,
    changes: before ? diffChanges(before, after) : null,
    organizationId: ctx.organizationId,
  }).catch(() => {});
  return { referral };
}

/**
 * Admin-only: permanently delete a referral and everything attached to it. Its
 * invoices cascade at the DB level; payouts recorded against it have their
 * `referralId` nulled (partner-level payout history is kept). Writes a `deleted`
 * audit entry with a snapshot of what was removed. Returns the owning `partnerId`
 * so the caller can refresh that partner's now-stale commission KPIs.
 */
export async function deleteReferralAction(
  id: string,
): Promise<{ ok: true; partnerId: string } | { error: string }> {
  const ctx = await requireAdmin();
  const deleted = await deleteReferral(ctx.organizationId, id);
  if (!deleted) return { error: "Referral not found" };

  await logActivity({
    userId: ctx.userId,
    action: "deleted",
    entityType: "referral",
    entityId: id,
    entityName: deleted.contactName,
    changes: { deletedRecord: snapshot(deleted) },
    organizationId: ctx.organizationId,
  }).catch(() => {});

  return { ok: true, partnerId: deleted.partnerId };
}

/** Admin-only: delete an invoice and recompute the referral's commission KPIs. */
export async function deleteInvoiceAction(invoiceId: string): Promise<ReferralResult> {
  const ctx = await requireAdmin();
  const deletedRow = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId: ctx.organizationId },
    select: { number: true, amount: true, status: true, issuedDate: true, paidDate: true },
  });
  const referral = await deleteInvoice(ctx.organizationId, invoiceId);
  if (!referral) return { error: "Invoice not found" };
  await logActivity({
    userId: ctx.userId,
    action: "deleted",
    entityType: "invoice",
    entityId: invoiceId,
    entityName: deletedRow?.number ?? referral.contactName,
    changes: deletedRow ? { deletedRecord: snapshot(deletedRow) } : null,
    organizationId: ctx.organizationId,
  }).catch(() => {});
  return { referral };
}
