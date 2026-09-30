import type { invoice_status, referral_status } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toDateString, toISOString, toNumber } from "@/lib/actions/mappers";
import { getAppConfig } from "@/lib/services/app-config-service";
import {
  type CommissionState,
  commissionWindow,
  type PartnerReferralRow,
  round2,
  windowedCommission,
} from "@/lib/services/partner-service";

// ── View-models ──
// The real source of truth for the admin Referrals feature. The service computes
// these from Referral → Invoice → Payout (+ owning Partner). Commission state and
// the `round2` / `commissionWindow` helpers are shared with `partner-service.ts`.

/**
 * One row of the admin Referrals list — every referral across all partners, with
 * its owning partner attached for the cross-partner view. The shared fields (status,
 * rate, commission window, earned) match a partner detail's referral row.
 */
export type ReferralListRow = PartnerReferralRow & {
  partnerId: string;
  partnerName: string;
};

/** One client invoice raised against a referral's deal. */
export type ReferralInvoiceRow = {
  /** Human-facing invoice number, e.g. "INV-2061". */
  id: string;
  /** Invoice DB id (TypeID) — used by the inline status control. */
  invoiceId: string;
  amount: number;
  status: invoice_status;
  /**
   * Commission accrued on this invoice (amount × the referral's rate), at full
   * precision — round only when displaying (the headline total is the authoritative
   * sum-then-round figure, see `windowedCommission`).
   */
  commission: number;
  /** When the invoice was issued (ISO date). */
  addedAt: string;
  /** When the invoice was paid (ISO date), or null when unpaid. */
  paidDate: string | null;
  /** Note visible to the partner (null when none). */
  publicNote: string | null;
  /** Internal-only note. Present for the admin view; stripped for the partner view. */
  privateNote: string | null;
};

/**
 * Full view-model for the admin referral detail page (`/admin/referrals/[id]`).
 * Combines the referral, its owning partner, the contact's details, and the client
 * invoices raised against the deal.
 */
export type ReferralDetail = {
  id: string;
  contactName: string;
  contactEmail: string | null;
  contactCompany: string | null;
  contactPhone: string | null;
  contactWebsite: string | null;
  notes: string | null;
  status: ReferralListRow["status"];
  commissionRate: number;
  commissionState: CommissionState;
  /** Boundary date for the commission state (ISO date). */
  commissionUntil: string;
  /** Length of the commission window in months (from AppConfig) — for banner copy. */
  commissionValidMonths: number;
  /** When the referral was submitted — the commission-window anchor (ISO date). */
  createdAt: string;
  partnerId: string;
  partnerName: string;
  partnerCompany: string | null;
  /** Total of every invoice raised on this referral, all statuses (USD). */
  totalInvoiced: number;
  /** Total of this referral's paid invoices (USD). */
  totalPaid: number;
  /** Commission accrued from this referral's paid invoices (USD). */
  commissionEarned: number;
  /** Commission actually paid out to the partner against this referral (USD). */
  commissionPaid: number;
  payoutCount: number;
  invoiceCount: number;
  invoices: ReferralInvoiceRow[];
};

// ── Queries ──

/** Every referral with its owning partner + derived commission, newest first. */
export async function listReferrals(organizationId: string): Promise<ReferralListRow[]> {
  const { commissionValidMonths } = await getAppConfig(organizationId);
  const referrals = await prisma.referral.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      contactName: true,
      contactEmail: true,
      contactCompany: true,
      status: true,
      commissionRate: true,
      contractEndedAt: true,
      createdAt: true,
      partner: { select: { id: true, fullName: true } },
      invoices: { where: { status: "paid" }, select: { amount: true, status: true, issuedDate: true } },
    },
  });

  return referrals.map((r) => {
    // Per-referral snapshot rate (TKT-005) — not the partner's live rate.
    const rate = toNumber(r.commissionRate);
    const window = commissionWindow(r.createdAt, r.contractEndedAt, commissionValidMonths);
    const earned = windowedCommission(r.invoices, rate, window.closeDate);
    return {
      id: r.id,
      contactName: r.contactName,
      contactEmail: r.contactEmail,
      contactCompany: r.contactCompany,
      status: r.status,
      commissionRate: rate,
      commissionState: window.state,
      commissionUntil: window.until,
      earned,
      // `createdAt` is an instant (Timestamptz) — serialize full-precision so the
      // client renders the "referred" date in the viewer's timezone, not UTC.
      createdAt: toISOString(r.createdAt),
      partnerId: r.partner.id,
      partnerName: r.partner.fullName,
    };
  });
}

/** A single referral's full detail (contact, partner, invoices, KPIs), or null. */
export async function getReferralDetail(
  organizationId: string,
  id: string,
): Promise<ReferralDetail | null> {
  const { commissionValidMonths } = await getAppConfig(organizationId);
  const r = await prisma.referral.findFirst({
    where: { id, organizationId },
    include: {
      partner: { select: { id: true, fullName: true, companyName: true } },
      invoices: {
        orderBy: { issuedDate: "desc" },
        select: {
          id: true,
          number: true,
          amount: true,
          status: true,
          issuedDate: true,
          paidDate: true,
          publicNote: true,
          privateNote: true,
        },
      },
      payouts: { select: { amount: true } },
    },
  });

  if (!r) return null;

  // Per-referral snapshot rate (TKT-005) — not the partner's live rate.
  const rate = toNumber(r.commissionRate);
  const window = commissionWindow(r.createdAt, r.contractEndedAt, commissionValidMonths);
  const invoices: ReferralInvoiceRow[] = r.invoices.map((inv) => ({
    id: inv.number,
    invoiceId: inv.id,
    amount: toNumber(inv.amount),
    status: inv.status,
    // Per-row commission reflects the ACTUAL contribution (domain Rule 1): only a
    // `paid` invoice issued on/before the window close earns — everything else is $0,
    // matching the headline `windowedCommission` so the column never overstates a
    // draft/sent or out-of-window invoice. Full precision; rounding is display-only.
    commission:
      inv.status === "paid" && inv.issuedDate <= window.closeDate
        ? (toNumber(inv.amount) * rate) / 100
        : 0,
    addedAt: toDateString(inv.issuedDate),
    paidDate: inv.paidDate ? toDateString(inv.paidDate) : null,
    publicNote: inv.publicNote,
    privateNote: inv.privateNote,
  }));
  // Commission accrues only on paid invoices issued within the window (domain Rule 1);
  // the table above lists every invoice so the admin still sees the full pipeline.
  const commissionEarned = windowedCommission(r.invoices, rate, window.closeDate);
  const commissionPaid = round2(r.payouts.reduce((sum, po) => sum + toNumber(po.amount), 0));
  const totalInvoiced = round2(r.invoices.reduce((sum, inv) => sum + toNumber(inv.amount), 0));
  const totalPaid = round2(
    r.invoices
      .filter((inv) => inv.status === "paid")
      .reduce((sum, inv) => sum + toNumber(inv.amount), 0),
  );

  return {
    id: r.id,
    contactName: r.contactName,
    contactEmail: r.contactEmail,
    contactCompany: r.contactCompany,
    contactPhone: r.contactPhone,
    contactWebsite: r.contactWebsite,
    notes: r.notes,
    status: r.status,
    commissionRate: rate,
    commissionState: window.state,
    commissionUntil: window.until,
    commissionValidMonths,
    createdAt: toISOString(r.createdAt),
    partnerId: r.partner.id,
    partnerName: r.partner.fullName,
    partnerCompany: r.partner.companyName,
    totalInvoiced,
    totalPaid,
    commissionEarned,
    commissionPaid,
    payoutCount: r.payouts.length,
    invoiceCount: invoices.length,
    invoices,
  };
}

// ── Mutations ──

/** Move a referral to a new pipeline status. */
export async function updateReferralStatus(
  organizationId: string,
  id: string,
  status: referral_status,
): Promise<ReferralDetail | null> {
  const owned = await prisma.referral.findFirst({
    where: { id, organizationId },
    select: { id: true },
  });
  if (!owned) return null;
  await prisma.referral.update({ where: { id }, data: { status } });
  return getReferralDetail(organizationId, id);
}

/** Close the commission window early (today) or reopen it (clear the end date). */
export async function setContractEnded(
  organizationId: string,
  id: string,
  ended: boolean,
  endedDate?: string,
): Promise<ReferralDetail | null> {
  const owned = await prisma.referral.findFirst({
    where: { id, organizationId },
    select: { id: true },
  });
  if (!owned) return null;
  await prisma.referral.update({
    where: { id },
    // `endedDate` (a local `YYYY-MM-DD` sent by the client) lands on the right
    // calendar day for the admin's timezone; fall back to "now" if it's absent.
    data: { contractEndedAt: ended ? new Date(endedDate ?? Date.now()) : null },
  });
  return getReferralDetail(organizationId, id);
}

export type CreateInvoiceInput = {
  invoiceNumber?: string | null;
  amount: number;
  status: invoice_status;
  /** Date the invoice was issued — the commission-window anchor. */
  issuedDate: Date;
  /** Date the invoice was paid — required when `status` is `paid`. */
  paidDate?: Date | null;
  publicNote?: string | null;
  privateNote?: string | null;
};

/**
 * Next sequential `INV-####` number. Lexicographic desc ordering equals numeric
 * ordering while numbers stay the same digit-length (seed is 1990–2111).
 */
async function nextInvoiceNumber(organizationId: string): Promise<string> {
  const last = await prisma.invoice.findFirst({
    where: { organizationId, number: { startsWith: "INV-" } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const n = last ? parseInt(last.number.replace(/^INV-/, ""), 10) : 2000;
  return `INV-${(Number.isFinite(n) ? n : 2000) + 1}`;
}

/**
 * Create a client invoice on a referral. `Invoice.partnerId` is denormalized
 * from the referral. A blank number auto-generates; `issuedDate` comes from the
 * form (defaults to today), and `paidDate` is stored when the invoice starts life
 * as `paid` (falling back to the issued date if none was supplied).
 */
export async function createInvoice(
  organizationId: string,
  referralId: string,
  input: CreateInvoiceInput,
): Promise<ReferralDetail | null> {
  const referral = await prisma.referral.findFirst({
    where: { id: referralId, organizationId },
    select: { partnerId: true },
  });
  if (!referral) return null;

  const number = input.invoiceNumber?.trim() || (await nextInvoiceNumber(organizationId));
  await prisma.invoice.create({
    data: {
      organizationId,
      number,
      referralId,
      partnerId: referral.partnerId,
      amount: input.amount,
      status: input.status,
      issuedDate: input.issuedDate,
      paidDate: input.status === "paid" ? (input.paidDate ?? input.issuedDate) : null,
      publicNote: input.publicNote ?? null,
      privateNote: input.privateNote ?? null,
    },
  });
  return getReferralDetail(organizationId, referralId);
}

/**
 * Change an invoice's status; sync `paidDate` when moving to/from `paid`. An
 * explicit `paidDate` wins; otherwise the existing one is kept, falling back to now.
 */
export async function setInvoiceStatus(
  organizationId: string,
  invoiceId: string,
  status: invoice_status,
  paidDate?: Date | null,
): Promise<ReferralDetail | null> {
  const existing = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    select: { referralId: true, paidDate: true },
  });
  if (!existing) return null;
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status,
      paidDate: status === "paid" ? (paidDate ?? existing.paidDate ?? new Date()) : null,
    },
  });
  return getReferralDetail(organizationId, existing.referralId);
}

/**
 * Edit an existing invoice (amount, status, dates, notes, and optionally the
 * number). A blank `invoiceNumber` leaves the existing number unchanged. `paidDate`
 * is kept only while the status is `paid` (falling back to the issued date). Recomputes
 * the referral's commission KPIs. Returns null when the invoice doesn't exist.
 */
export async function updateInvoice(
  organizationId: string,
  invoiceId: string,
  input: CreateInvoiceInput,
): Promise<ReferralDetail | null> {
  const existing = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    select: { referralId: true },
  });
  if (!existing) return null;
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      ...(input.invoiceNumber?.trim() ? { number: input.invoiceNumber.trim() } : {}),
      amount: input.amount,
      status: input.status,
      issuedDate: input.issuedDate,
      paidDate: input.status === "paid" ? (input.paidDate ?? input.issuedDate) : null,
      publicNote: input.publicNote ?? null,
      privateNote: input.privateNote ?? null,
    },
  });
  return getReferralDetail(organizationId, existing.referralId);
}

/** Delete an invoice and recompute the referral's commission KPIs. Null when absent. */
export async function deleteInvoice(
  organizationId: string,
  invoiceId: string,
): Promise<ReferralDetail | null> {
  const existing = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    select: { referralId: true },
  });
  if (!existing) return null;
  await prisma.invoice.delete({ where: { id: invoiceId } });
  return getReferralDetail(organizationId, existing.referralId);
}

/**
 * Point-in-time snapshot of a deleted referral — what the cascade removed, for the
 * audit log. Carries the owning `partnerId` so the caller can invalidate that
 * partner's caches (their commission KPIs derived from this referral are now gone).
 */
export type DeletedReferral = {
  id: string;
  contactName: string;
  contactEmail: string | null;
  contactCompany: string | null;
  status: referral_status;
  partnerId: string;
  invoiceCount: number;
};

/**
 * Permanently delete a referral. Its invoices cascade at the DB level
 * (`Invoice.referral` → `onDelete: Cascade`); any payouts recorded against it have
 * their `referralId` nulled (`Payout.referral` → `SetNull`) so the partner-level
 * payout history is retained. Returns a snapshot of what was removed (with the
 * owning `partnerId`), or null when no such referral exists.
 */
export async function deleteReferral(
  organizationId: string,
  referralId: string,
): Promise<DeletedReferral | null> {
  const r = await prisma.referral.findFirst({
    where: { id: referralId, organizationId },
    select: {
      id: true,
      contactName: true,
      contactEmail: true,
      contactCompany: true,
      status: true,
      partnerId: true,
      _count: { select: { invoices: true } },
    },
  });
  if (!r) return null;

  await prisma.referral.delete({ where: { id: referralId } });

  return {
    id: r.id,
    contactName: r.contactName,
    contactEmail: r.contactEmail,
    contactCompany: r.contactCompany,
    status: r.status,
    partnerId: r.partnerId,
    invoiceCount: r._count.invoices,
  };
}

// ── Partner portal ──
// Partner-scoped reads/writes for the partner's own "My Referrals" page. Always
// filtered to a single `partnerId` (resolved from the session), never across partners.

/** Outcome of a partner-initiated referral delete — a guarded, ownership-scoped delete. */
export type PartnerDeleteReferralResult =
  | { ok: true; deleted: DeletedReferral }
  | { ok: false; reason: "not_found" | "forbidden" | "not_submitted" };

/**
 * Delete a referral on behalf of its owning partner. Enforces two invariants a
 * partner-facing delete must never violate: the referral belongs to `partnerId`
 * (mirrors {@link getPartnerReferralDetail}'s ownership check) and it's still in
 * the `submitted` stage (no invoices/payouts exist yet, so nothing downstream is
 * lost). Hard delete, same as the admin path. Returns a tagged result so the action
 * can map each failure to a message without leaking ownership.
 */
export async function deletePartnerReferral(
  organizationId: string,
  partnerId: string,
  referralId: string,
): Promise<PartnerDeleteReferralResult> {
  const r = await prisma.referral.findFirst({
    where: { id: referralId, organizationId },
    select: {
      id: true,
      contactName: true,
      contactEmail: true,
      contactCompany: true,
      status: true,
      partnerId: true,
      _count: { select: { invoices: true } },
    },
  });
  if (!r) return { ok: false, reason: "not_found" };
  if (r.partnerId !== partnerId) return { ok: false, reason: "forbidden" };
  if (r.status !== "submitted") return { ok: false, reason: "not_submitted" };

  await prisma.referral.delete({ where: { id: referralId } });

  return {
    ok: true,
    deleted: {
      id: r.id,
      contactName: r.contactName,
      contactEmail: r.contactEmail,
      contactCompany: r.contactCompany,
      status: r.status,
      partnerId: r.partnerId,
      invoiceCount: r._count.invoices,
    },
  };
}

/**
 * One row of a partner's own "My Referrals" list. Like `PartnerReferralRow`, but
 * carries the partner-facing extras shown in the portal: the most-recent invoice
 * date and the total commission earned so far.
 */
export type PartnerReferralListRow = {
  id: string;
  contactName: string;
  contactCompany: string | null;
  status: referral_status;
  /** Lifecycle of this referral's commission window. */
  commissionState: CommissionState;
  /** Boundary date for the commission state (ISO date). */
  commissionUntil: string;
  /** When the referral was submitted (ISO date). */
  createdAt: string;
  /** Issue date of the most recent invoice on this referral, or null. */
  lastInvoiceAt: string | null;
  /** Commission earned from this referral's paid invoices (USD; 0 when none yet). */
  totalCommission: number;
};

/** Every referral owned by one partner, newest first, with portal-facing derivations. */
export async function listPartnerReferrals(
  organizationId: string,
  partnerId: string,
): Promise<PartnerReferralListRow[]> {
  const { commissionValidMonths } = await getAppConfig(organizationId);

  const referrals = await prisma.referral.findMany({
    where: { partnerId, organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      contactName: true,
      contactCompany: true,
      status: true,
      commissionRate: true,
      contractEndedAt: true,
      createdAt: true,
      invoices: { select: { amount: true, status: true, issuedDate: true } },
    },
  });

  return referrals.map((r) => {
    // Per-referral snapshot rate (TKT-005) — not the partner's live rate.
    const rate = toNumber(r.commissionRate);
    const window = commissionWindow(r.createdAt, r.contractEndedAt, commissionValidMonths);
    const totalCommission = windowedCommission(r.invoices, rate, window.closeDate);
    const lastInvoice = r.invoices.reduce<Date | null>(
      (latest, inv) => (!latest || inv.issuedDate > latest ? inv.issuedDate : latest),
      null,
    );
    return {
      id: r.id,
      contactName: r.contactName,
      contactCompany: r.contactCompany,
      status: r.status,
      commissionState: window.state,
      commissionUntil: window.until,
      createdAt: toISOString(r.createdAt),
      lastInvoiceAt: lastInvoice ? toDateString(lastInvoice) : null,
      totalCommission,
    };
  });
}

/**
 * A single referral's detail, scoped to its owning partner (partner portal). Returns
 * null unless the referral belongs to `partnerId`. Strips the admin-only invoice
 * `privateNote` before returning, so no internal note can ever reach the partner.
 */
export async function getPartnerReferralDetail(
  organizationId: string,
  partnerId: string,
  referralId: string,
): Promise<ReferralDetail | null> {
  const detail = await getReferralDetail(organizationId, referralId);
  if (!detail || detail.partnerId !== partnerId) return null;
  return {
    ...detail,
    invoices: detail.invoices.map((inv) => ({ ...inv, privateNote: null })),
  };
}

/** Fields a partner can submit when referring a new contact (empty → null). */
export type CreateReferralInput = {
  contactName: string;
  contactEmail?: string | null;
  contactCompany?: string | null;
  contactPhone?: string | null;
  contactWebsite?: string | null;
  notes?: string | null;
};

/**
 * Create a new referral owned by a partner; starts in the `submitted` status.
 * Snapshots the partner's CURRENT commission rate onto the referral (TKT-005) so a
 * later change to the partner's rate never re-prices this referral's earned
 * commission. Falls back to the column default only if the partner can't be read.
 */
export async function createReferral(
  organizationId: string,
  partnerId: string,
  input: CreateReferralInput,
): Promise<{ id: string }> {
  const partner = await prisma.partner.findFirst({
    where: { id: partnerId, organizationId },
    select: { commissionRate: true },
  });
  const referral = await prisma.referral.create({
    data: {
      organizationId,
      partnerId,
      contactName: input.contactName,
      contactEmail: input.contactEmail ?? null,
      contactCompany: input.contactCompany ?? null,
      contactPhone: input.contactPhone ?? null,
      contactWebsite: input.contactWebsite ?? null,
      notes: input.notes ?? null,
      status: "submitted",
      ...(partner ? { commissionRate: partner.commissionRate } : {}),
    },
  });
  return { id: referral.id };
}
