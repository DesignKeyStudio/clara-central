import { prisma } from "@/lib/prisma";
import { toISOString, toNumber } from "@/lib/actions/mappers";
import { getAppConfig } from "@/lib/services/app-config-service";
import { commissionWindow, round2, windowedCommission } from "@/lib/services/partner-service";

// ── View-models ──
// Payout reads/writes. Earned commission is derived from paid invoices (see
// partner-service / referral-service); payouts are the stored record of commission
// actually paid to a partner. A payout is partner-level (`referralId` null) or
// referral-level (`referralId` set) — both reduce the partner's owed balance.

/** One row of a partner's own Payouts list — a commission payment they received. */
export type PartnerPayoutRow = {
  id: string;
  /** When the payout was made (ISO date). */
  paidAt: string;
  /** Amount paid (USD). */
  amount: number;
  /** Note from the agency, visible to the partner (null when none). */
  note: string | null;
};

/** One row of the admin Payouts list — every payout across all partners. */
export type PayoutListRow = {
  id: string;
  partnerId: string;
  partnerName: string;
  /** Set when the payout is referral-level; null for a partner-level payout. */
  referralId: string | null;
  /** Amount paid (USD). */
  amount: number;
  /** Note visible to the partner. */
  noteToPartner: string;
  /** Internal-only note (admin-facing). */
  privateNote: string;
  /** When the payout was made (ISO date). */
  paidAt: string;
};

/** Commission earned / paid / owed for a partner or a single referral (USD). */
export type CommissionSummary = { earned: number; paid: number; owed: number };

// ── Queries ──

/** Every payout made to one partner, newest first (partner portal). */
export async function listPartnerPayouts(
  organizationId: string,
  partnerId: string,
): Promise<PartnerPayoutRow[]> {
  const payouts = await prisma.payout.findMany({
    where: { organizationId, partnerId },
    orderBy: { createdAt: "desc" },
    select: { id: true, amount: true, publicNote: true, createdAt: true },
  });

  return payouts.map((p) => ({
    id: p.id,
    paidAt: toISOString(p.createdAt),
    amount: toNumber(p.amount),
    note: p.publicNote,
  }));
}

/** Every payout across all partners, newest first (admin Payouts page). */
export async function listPayouts(organizationId: string): Promise<PayoutListRow[]> {
  const payouts = await prisma.payout.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      partnerId: true,
      referralId: true,
      amount: true,
      publicNote: true,
      privateNote: true,
      createdAt: true,
      partner: { select: { fullName: true } },
    },
  });

  return payouts.map((p) => ({
    id: p.id,
    partnerId: p.partnerId,
    partnerName: p.partner.fullName,
    referralId: p.referralId,
    amount: toNumber(p.amount),
    noteToPartner: p.publicNote ?? "",
    privateNote: p.privateNote ?? "",
    paidAt: toISOString(p.createdAt),
  }));
}

/**
 * Platform-wide commission totals for the admin Payouts page. Earned is windowed
 * per referral (Rule 1) using each referral's OWN snapshot rate (TKT-005), not the
 * partner's live rate; paid is the sum of every payout; owed is the difference.
 */
export async function getPayoutsSummary(organizationId: string): Promise<CommissionSummary> {
  const { commissionValidMonths } = await getAppConfig(organizationId);
  const [referrals, payouts] = await Promise.all([
    prisma.referral.findMany({
      where: { organizationId },
      select: {
        createdAt: true,
        contractEndedAt: true,
        commissionRate: true,
        invoices: {
          where: { status: "paid" },
          select: { amount: true, status: true, issuedDate: true },
        },
      },
    }),
    prisma.payout.findMany({ where: { organizationId }, select: { amount: true } }),
  ]);

  const earned = round2(
    referrals.reduce((sum, r) => {
      const rate = toNumber(r.commissionRate);
      const { closeDate } = commissionWindow(r.createdAt, r.contractEndedAt, commissionValidMonths);
      return sum + windowedCommission(r.invoices, rate, closeDate);
    }, 0),
  );
  const paid = round2(payouts.reduce((s, p) => s + toNumber(p.amount), 0));
  return { earned, paid, owed: round2(earned - paid) };
}

// ── Mutations ──

export type RecordPayoutInput = {
  partnerId: string;
  /** Set for a referral-level payment; null for a partner-level payout. */
  referralId: string | null;
  amount: number;
  publicNote?: string | null;
  privateNote?: string | null;
};

/**
 * Record a commission payout to a partner. Per the commission-engine spec the
 * system does NOT cap a payout at the owed balance — recording more than is owed is
 * allowed and simply drives the outstanding balance negative. The over-payment
 * warning is surfaced (non-blocking) in the record-payout dialog. Returns null when
 * the partner doesn't exist.
 */
export async function recordPayout(
  organizationId: string,
  input: RecordPayoutInput,
): Promise<{ id: string; partnerName: string; partnerEmail: string } | null> {
  const partner = await prisma.partner.findFirst({
    where: { id: input.partnerId, organizationId },
    select: { fullName: true, email: true },
  });
  if (!partner) return null;

  // A referral-level payout must reference a referral in THIS org that belongs to
  // the same partner — never a client-supplied id from another org/partner.
  if (input.referralId) {
    const referral = await prisma.referral.findFirst({
      where: { id: input.referralId, organizationId, partnerId: input.partnerId },
      select: { id: true },
    });
    if (!referral) return null;
  }

  const payout = await prisma.payout.create({
    data: {
      organizationId,
      partnerId: input.partnerId,
      referralId: input.referralId,
      amount: input.amount,
      publicNote: input.publicNote ?? null,
      privateNote: input.privateNote ?? null,
    },
    select: { id: true },
  });
  return { id: payout.id, partnerName: partner.fullName, partnerEmail: partner.email };
}

export type UpdatePayoutInput = {
  amount: number;
  publicNote?: string | null;
  privateNote?: string | null;
};

/** A payout's editable fields, snapshotted for audit diffs. */
export type PayoutSnapshot = { amount: number; publicNote: string | null; privateNote: string | null };

/**
 * Edit an existing payout's amount/notes (no owed cap — see `recordPayout`). Null when
 * absent. Returns the pre-edit values (`before`) so callers can build an audit diff.
 */
export async function updatePayout(
  organizationId: string,
  payoutId: string,
  input: UpdatePayoutInput,
): Promise<
  | { id: string; partnerId: string; partnerName: string; referralId: string | null; before: PayoutSnapshot }
  | null
> {
  const existing = await prisma.payout.findFirst({
    where: { id: payoutId, organizationId },
    select: {
      partnerId: true,
      referralId: true,
      amount: true,
      publicNote: true,
      privateNote: true,
      partner: { select: { fullName: true } },
    },
  });
  if (!existing) return null;
  await prisma.payout.update({
    where: { id: payoutId },
    data: {
      amount: input.amount,
      publicNote: input.publicNote ?? null,
      privateNote: input.privateNote ?? null,
    },
  });
  return {
    id: payoutId,
    partnerId: existing.partnerId,
    partnerName: existing.partner.fullName,
    referralId: existing.referralId,
    before: {
      amount: toNumber(existing.amount),
      publicNote: existing.publicNote,
      privateNote: existing.privateNote,
    },
  };
}

/**
 * Delete a payout; the freed amount returns to the partner's owed balance. Null when
 * absent. Returns the deleted record's values (`deleted`) for the audit trail.
 */
export async function deletePayout(
  organizationId: string,
  payoutId: string,
): Promise<
  | { partnerId: string; partnerName: string; referralId: string | null; deleted: PayoutSnapshot }
  | null
> {
  const existing = await prisma.payout.findFirst({
    where: { id: payoutId, organizationId },
    select: {
      partnerId: true,
      referralId: true,
      amount: true,
      publicNote: true,
      privateNote: true,
      partner: { select: { fullName: true } },
    },
  });
  if (!existing) return null;
  await prisma.payout.delete({ where: { id: payoutId } });
  return {
    partnerId: existing.partnerId,
    partnerName: existing.partner.fullName,
    referralId: existing.referralId,
    deleted: {
      amount: toNumber(existing.amount),
      publicNote: existing.publicNote,
      privateNote: existing.privateNote,
    },
  };
}
