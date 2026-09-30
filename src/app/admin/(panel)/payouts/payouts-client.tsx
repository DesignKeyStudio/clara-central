"use client";

import { useMemo, useState } from "react";
import { Coins, Scale, Search, Wallet } from "lucide-react";
import { KpiCard } from "@/components/custom/kpi-card";
import { PageHeader } from "@/components/custom/page-header";
import { TimeRangeSelect } from "@/components/custom/time-range-select";
import { DataTable } from "@/components/data-table";
import { Input } from "@/components/ui/input";
import { usePayouts, usePayoutsSummary } from "@/lib/queries/hooks";
import { formatCurrency, withinTimeRange, type TimeRange } from "@/lib/utils";
import { payoutColumns } from "./columns";

export function PayoutsClient() {
  const { data: payouts = [], isLoading } = usePayouts();
  const { data: summary } = usePayoutsSummary();
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<TimeRange>("any");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payouts.filter((p) => {
      if (!withinTimeRange(p.paidAt, range)) return false;
      if (!q) return true;
      return p.partnerName.toLowerCase().includes(q);
    });
  }, [payouts, search, range]);

  return (
    <div className="space-y-6">
      <PageHeader title="Payouts" subtitle="All commission payouts to partners." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Total commission earned"
          value={formatCurrency(summary?.earned ?? 0)}
          icon={Coins}
        />
        <KpiCard label="Total paid out" value={formatCurrency(summary?.paid ?? 0)} icon={Wallet} />
        <KpiCard
          label="Outstanding balance"
          value={formatCurrency(summary?.owed ?? 0)}
          icon={Scale}
          valueClassName={(summary?.owed ?? 0) < 0 ? "text-destructive" : undefined}
          iconClassName={(summary?.owed ?? 0) < 0 ? "bg-destructive/10" : undefined}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by partner…"
            className="pl-9"
            aria-label="Search payouts by partner name"
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
        columns={payoutColumns}
        data={filtered}
        isLoading={isLoading}
        pageSize={25}
        emptyMessage="No payouts match your filters."
      />
    </div>
  );
}
