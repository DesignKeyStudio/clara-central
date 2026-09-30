import type { referral_status } from "@prisma/client";
import { format, startOfMonth, subMonths } from "date-fns";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/actions/mappers";
import { getAppConfig } from "@/lib/services/app-config-service";
import { commissionWindow, round2, windowedCommission } from "@/lib/services/partner-service";
import { getPayoutsSummary, type CommissionSummary } from "@/lib/services/payout-service";

// ── View-models ──
// Read-only aggregates for the admin overview dashboard (/admin). Everything here
// is derived from existing data — no new tables. The headline commission trio is
// the SAME `getPayoutsSummary()` the Payouts page uses, so the KPIs reconcile by
// construction; the funnel/conversion/trend are computed from a single referral
// + payout read.

/** One bar of the referral funnel — a pipeline status and how many referrals sit in it. */
export type ReferralFunnelRow = { status: referral_status; count: number };

/** One month of the commission trend chart: commission earned vs. paid that month (USD). */
export type CommissionTrendPoint = {
  /** Month key, e.g. "2026-06" (sortable). */
  month: string;
  /** Short display label, e.g. "Jun". */
  label: string;
  /** Commission that accrued from paid invoices issued that month (windowed). */
  earned: number;
  /** Commission actually paid out to partners that month. */
  paid: number;
};

/** Full payload for the admin dashboard. */
export type DashboardData = {
  /** Platform-wide commission earned / paid / outstanding (windowed) — matches Payouts. */
  commission: CommissionSummary;
  /** Approved partners. */
  activePartners: number;
  /** Partners awaiting approval (self-signups + pending). */
  pendingApplications: number;
  /** Every referral across all partners. */
  totalReferrals: number;
  /** Referrals that converted (status `deal_closed`). */
  conversions: number;
  /** Conversion rate as a 0–100 percentage (`conversions / totalReferrals`). */
  conversionRate: number;
  /** Referral counts per pipeline status, in canonical funnel order. */
  referralFunnel: ReferralFunnelRow[];
  /** Last 6 months of commission earned vs. paid (oldest → newest). */
  commissionTrend: CommissionTrendPoint[];
};

/** Canonical pipeline order for the funnel (advancing stages first, then terminal). */
const FUNNEL_ORDER: referral_status[] = [
  "submitted",
  "contacted",
  "meeting_scheduled",
  "proposal_sent",
  "negotiating",
  "deal_closed",
  "no_response",
  "not_qualified",
  "lost",
];

/** How many trailing months (including the current one) the trend chart spans. */
const TREND_MONTHS = 6;

// ── Query ──

/** Aggregate the whole platform into the admin dashboard view-model. */
export async function getDashboardData(organizationId: string): Promise<DashboardData> {
  const { commissionValidMonths } = await getAppConfig(organizationId);

  const [commission, partnerGroups, referrals, payouts] = await Promise.all([
    // Headline trio — reuse the Payouts summary so the KPIs reconcile exactly.
    getPayoutsSummary(organizationId),
    prisma.partner.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: { _all: true },
    }),
    prisma.referral.findMany({
      where: { organizationId },
      select: {
        status: true,
        createdAt: true,
        contractEndedAt: true,
        commissionRate: true,
        invoices: {
          where: { organizationId, status: "paid" },
          select: { amount: true, status: true, issuedDate: true },
        },
      },
    }),
    prisma.payout.findMany({
      where: { organizationId },
      select: { amount: true, createdAt: true },
    }),
  ]);

  const activePartners = partnerGroups.find((g) => g.status === "approved")?._count._all ?? 0;
  const pendingApplications = partnerGroups.find((g) => g.status === "pending")?._count._all ?? 0;

  const totalReferrals = referrals.length;
  const conversions = referrals.filter((r) => r.status === "deal_closed").length;
  const conversionRate = totalReferrals === 0 ? 0 : round2((conversions / totalReferrals) * 100);

  // Funnel — count per status, always emit every stage (zero-filled) for a stable axis.
  const statusCounts = referrals.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  const referralFunnel: ReferralFunnelRow[] = FUNNEL_ORDER.map((status) => ({
    status,
    count: statusCounts[status] ?? 0,
  }));

  // Trend — last TREND_MONTHS buckets (oldest → newest). Earned attributes each paid
  // invoice's commission to its issued month, but only when it falls inside the
  // referral's commission window (same filter as `windowedCommission`) so the trend
  // reconciles with the earned KPI. Paid attributes each payout to its month.
  const trend = new Map<string, CommissionTrendPoint>();
  for (let i = TREND_MONTHS - 1; i >= 0; i--) {
    const d = startOfMonth(subMonths(new Date(), i));
    const key = format(d, "yyyy-MM");
    trend.set(key, { month: key, label: format(d, "MMM"), earned: 0, paid: 0 });
  }

  for (const r of referrals) {
    const rate = toNumber(r.commissionRate); // per-referral snapshot rate (TKT-005)
    const { closeDate } = commissionWindow(r.createdAt, r.contractEndedAt, commissionValidMonths);
    for (const inv of r.invoices) {
      if (inv.issuedDate > closeDate) continue; // outside the window — does not accrue
      const key = format(inv.issuedDate, "yyyy-MM");
      const point = trend.get(key);
      if (point) point.earned = round2(point.earned + (toNumber(inv.amount) * rate) / 100);
    }
  }

  for (const p of payouts) {
    const key = format(p.createdAt, "yyyy-MM");
    const point = trend.get(key);
    if (point) point.paid = round2(point.paid + toNumber(p.amount));
  }

  return {
    commission,
    activePartners,
    pendingApplications,
    totalReferrals,
    conversions,
    conversionRate,
    referralFunnel,
    commissionTrend: [...trend.values()],
  };
}
