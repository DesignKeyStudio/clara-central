"use client";

import { useMemo, useState } from "react";
import { Clock, Coins, Scale, Search, Wallet } from "lucide-react";
import { KpiCard } from "@/components/custom/kpi-card";
import { PageHeader } from "@/components/custom/page-header";
import { TimeRangeSelect } from "@/components/custom/time-range-select";
import { DataTable } from "@/components/data-table";
import { Input } from "@/components/ui/input";
import { useMyPartnerSummary, useMyPayouts } from "@/lib/queries/hooks";
import { formatCurrency, withinTimeRange, type TimeRange } from "@/lib/utils";
import { partnerPayoutColumns } from "./columns";

export function PartnerPayoutsClient({ cadenceNote }: { cadenceNote: string | null }) {
  const { data: payouts = [], isLoading } = useMyPayouts();
  const { data: summary } = useMyPartnerSummary();
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<TimeRange>("any");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payouts.filter((p) => {
      if (!withinTimeRange(p.paidAt, range)) return false;
      if (!q) return true;
      return p.note?.toLowerCase().includes(q) ?? false;
    });
  }, [payouts, search, range]);

  return (
    <div className="space-y-6">
      <PageHeader title="Payouts" subtitle="Commission paid out to you by Clara Central." />

      {/* Cadence note — admin-configured; hidden when unset. */}
      {cadenceNote && (
        <div
          role="note"
          className="flex items-start gap-2.5 rounded-lg border border-success/20 bg-success/5 px-4 py-3 text-sm text-success"
        >
          <Clock className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Payout schedule</p>
            <p>{cadenceNote}</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total commission earned"
          value={formatCurrency(summary?.commissionEarned ?? 0)}
          icon={Coins}
          iconClassName="bg-success/10"
        />
        <KpiCard
          label="Total paid out"
          value={formatCurrency(summary?.commissionPaid ?? 0)}
          icon={Wallet}
        />
        <KpiCard
          label="Outstanding balance"
          value={formatCurrency(summary?.commissionOwed ?? 0)}
          icon={Scale}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes…"
            className="pl-9"
            aria-label="Search payouts"
          />
        </div>
        <TimeRangeSelect
          value={range}
          onChange={setRange}
          ariaLabel="Filter payouts by payment date"
        />
        <span className="shrink-0 text-sm text-muted-foreground">
          {filtered.length} of {payouts.length}
        </span>
      </div>

      <DataTable
        columns={partnerPayoutColumns}
        data={filtered}
        isLoading={isLoading}
        pageSize={15}
        emptyMessage={payouts.length === 0 ? "No payouts yet." : "No payouts match your filters."}
      />
    </div>
  );
}
