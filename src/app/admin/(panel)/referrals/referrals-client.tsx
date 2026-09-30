"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { referral_status } from "@prisma/client";
import { ListFilter, Search, X } from "lucide-react";
import { PageHeader } from "@/components/custom/page-header";
import { StatusBadge } from "@/components/custom/status-badge";
import { TimeRangeSelect } from "@/components/custom/time-range-select";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useReferrals } from "@/lib/queries/hooks";
import { referralStatusMeta } from "@/lib/status-meta";
import { withinTimeRange, type TimeRange } from "@/lib/utils";
import { referralColumns } from "./columns";

/** Pipeline statuses, in funnel order, for the Status filter. */
const STATUS_OPTIONS: referral_status[] = [
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

export function ReferralsClient() {
  const router = useRouter();
  const { data: referrals = [], isLoading } = useReferrals();
  const [search, setSearch] = useState("");
  const [statuses, setStatuses] = useState<referral_status[]>([]);
  const [range, setRange] = useState<TimeRange>("any");

  const toggleStatus = (s: referral_status) =>
    setStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return referrals.filter((r) => {
      if (statuses.length > 0 && !statuses.includes(r.status)) return false;
      if (!withinTimeRange(r.createdAt, range)) return false;
      if (!q) return true;
      return (
        r.contactName.toLowerCase().includes(q) ||
        (r.contactCompany?.toLowerCase().includes(q) ?? false) ||
        r.partnerName.toLowerCase().includes(q)
      );
    });
  }, [referrals, search, statuses, range]);

  return (
    <div className="space-y-6">
      <PageHeader title="Referrals" subtitle="Every referral across all partners." />

      {/* Toolbar */}
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contact, company, or partner…"
            className="pl-9 pr-9"
            aria-label="Search referrals"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-[170px] justify-start bg-white font-normal"
              aria-label="Filter by referral status"
            >
              <ListFilter className="mr-2 size-4" />
              Referral Status
              {statuses.length > 0 && (
                <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                  {statuses.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Filter by referral status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {STATUS_OPTIONS.map((s) => (
              <DropdownMenuCheckboxItem
                key={s}
                checked={statuses.includes(s)}
                onCheckedChange={() => toggleStatus(s)}
                onSelect={(e) => e.preventDefault()}
                showIndicator={false}
              >
                <StatusBadge {...referralStatusMeta(s)} className="border-0" />
                <Checkbox
                  checked={statuses.includes(s)}
                  aria-hidden
                  tabIndex={-1}
                  className="pointer-events-none ml-auto"
                />
              </DropdownMenuCheckboxItem>
            ))}
            {statuses.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setStatuses([])}>Clear filters</DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <TimeRangeSelect
          value={range}
          onChange={setRange}
          ariaLabel="Filter referrals by submitted date"
        />
        <span className="shrink-0 text-sm text-muted-foreground">
          {filtered.length} of {referrals.length}
        </span>
      </div>

      {statuses.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => {
            const meta = referralStatusMeta(s);
            return (
              <StatusBadge
                key={s}
                label={meta.label}
                tone={meta.tone}
                onRemove={() => toggleStatus(s)}
                removeLabel={`Remove ${meta.label} filter`}
              />
            );
          })}
        </div>
      )}

      <DataTable
        columns={referralColumns}
        data={filtered}
        isLoading={isLoading}
        pageSize={25}
        emptyMessage="No referrals match your filters."
        onRowClick={(r) => router.push(`/admin/referrals/${r.id}`)}
      />
    </div>
  );
}
