"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KpiCard } from "@/components/custom/kpi-card";
import { PageHeader } from "@/components/custom/page-header";
import { useDashboard } from "@/lib/queries/hooks";
import { referralStatusMeta } from "@/lib/status-meta";
import { formatCurrency } from "@/lib/utils";
import { CommissionTrendChart, ReferralFunnelChart } from "./dashboard-charts";
import DashboardLoading from "./loading";

export function DashboardClient() {
  const { data: dashboard } = useDashboard();

  // Reads are server-prefetched + hydrated, so `dashboard` is normally present on
  // first render; this guard only covers a cache miss / background refetch.
  if (!dashboard) return <DashboardLoading />;

  const {
    commission,
    activePartners,
    pendingApplications,
    totalReferrals,
    conversions,
    conversionRate,
    referralFunnel,
    commissionTrend,
  } = dashboard;

  const funnelData = referralFunnel.map((row) => ({
    label: referralStatusMeta(row.status).label,
    count: row.count,
  }));
  const owedNegative = commission.owed < 0;
  const hasReferrals = totalReferrals > 0;
  const hasTrend = commissionTrend.some((point) => point.earned > 0 || point.paid > 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Program performance at a glance." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Commission earned"
          value={formatCurrency(commission.earned)}
          subtitle="All-time, windowed"
        />
        <KpiCard label="Paid out" value={formatCurrency(commission.paid)} subtitle="To partners" />
        <KpiCard
          label="Outstanding balance"
          value={formatCurrency(commission.owed)}
          subtitle={owedNegative ? "Over-paid" : "Earned − paid"}
          valueClassName={owedNegative ? "text-destructive" : undefined}
        />
        <KpiCard
          label="Active partners"
          value={activePartners.toLocaleString()}
          subtitle="Approved"
          linkLabel="Manage"
          linkHref="/admin/partners"
        />
        <KpiCard
          label="Pending applications"
          value={pendingApplications.toLocaleString()}
          subtitle="Awaiting approval"
          linkLabel={pendingApplications > 0 ? "Review" : undefined}
          linkHref={pendingApplications > 0 ? "/admin/partners" : undefined}
        />
        <KpiCard
          label="Total referrals"
          value={totalReferrals.toLocaleString()}
          subtitle="All partners"
          linkLabel="View"
          linkHref="/admin/referrals"
        />
        <KpiCard label="Conversions" value={conversions.toLocaleString()} subtitle="Deals closed" />
        <KpiCard
          label="Conversion rate"
          value={`${Math.round(conversionRate)}%`}
          subtitle={`${conversions} of ${totalReferrals} referrals`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Commission over time</CardTitle>
            <CardDescription>Earned vs. paid, last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {hasTrend ? (
              <CommissionTrendChart data={commissionTrend} />
            ) : (
              <EmptyChart message="No commission activity in the last 6 months." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Referral funnel</CardTitle>
            <CardDescription>Referrals by pipeline status</CardDescription>
          </CardHeader>
          <CardContent>
            {hasReferrals ? (
              <ReferralFunnelChart data={funnelData} />
            ) : (
              <EmptyChart message="No referrals yet." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
