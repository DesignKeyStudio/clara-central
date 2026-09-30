"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { referral_status } from "@prisma/client";
import { CheckCircle2, Coins, List, ListFilter, Plus, Receipt, Search, Wallet, X } from "lucide-react";
import { KpiCard } from "@/components/custom/kpi-card";
import { PageHeader } from "@/components/custom/page-header";
import { StatusBadge } from "@/components/custom/status-badge";
import { TimeRangeSelect } from "@/components/custom/time-range-select";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
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
import { useMyPartnerSummary, useMyReferrals } from "@/lib/queries/hooks";
import { referralStatusMeta } from "@/lib/status-meta";
import { formatCurrency, withinTimeRange, type TimeRange } from "@/lib/utils";
import { partnerReferralColumns } from "./columns";
import { ReferContactDialog } from "./refer-contact-dialog";
import { ReferralLinkCard } from "./referral-link-card";

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

export function MyReferralsClient() {
  const router = useRouter();
  const { data: referrals = [], isLoading } = useMyReferrals();
  const { data: summary } = useMyPartnerSummary();
  const [search, setSearch] = useState("");
  const [statuses, setStatuses] = useState<referral_status[]>([]);
  const [range, setRange] = useState<TimeRange>("any");
  const [referOpen, setReferOpen] = useState(false);

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
        (r.contactCompany?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [referrals, search, statuses, range]);

  const emptyMessage =
    referrals.length === 0
      ? "No referrals yet — use “Refer a contact” to introduce your first prospect."
      : "No referrals match your filters.";

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Referrals"
        subtitle={
          <>
            Contacts you&apos;ve referred to Clara Central · Commission rate:{" "}
            <strong className="text-success">{summary ? `${summary.commissionRate}%` : "…"}</strong>
          </>
        }
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/partner/payouts">
                <Receipt className="size-4" />
                View payouts
              </Link>
            </Button>
            <Button onClick={() => setReferOpen(true)}>
              <Plus className="size-4" />
              Refer a contact
            </Button>
          </>
        }
      />

      {summary?.referralCode && <ReferralLinkCard code={summary.referralCode} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total referrals" value={`${summary?.referralCount ?? 0}`} icon={List} />
        <KpiCard label="Conversions" value={`${summary?.conversionsCount ?? 0}`} icon={CheckCircle2} />
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
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contact or company…"
            className="pl-9"
            aria-label="Search referrals"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-[170px] justify-start bg-white font-normal"
              aria-label="Filter by status"
            >
              <ListFilter className="mr-2 size-4" />
              Status
              {statuses.length > 0 && (
                <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                  {statuses.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {STATUS_OPTIONS.map((s) => (
              <DropdownMenuCheckboxItem
                key={s}
                checked={statuses.includes(s)}
                onCheckedChange={() => toggleStatus(s)}
                onSelect={(e) => e.preventDefault()}
              >
                {referralStatusMeta(s).label}
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
              <button
                key={s}
                type="button"
                onClick={() => toggleStatus(s)}
                aria-label={`Remove ${meta.label} filter`}
                className="inline-flex items-center gap-1 rounded-full border pr-2 text-xs hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <StatusBadge label={meta.label} tone={meta.tone} className="border-0" />
                <X className="size-3 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      )}

      <DataTable
        columns={partnerReferralColumns}
        data={filtered}
        isLoading={isLoading}
        pageSize={15}
        emptyMessage={emptyMessage}
        onRowClick={(r) => router.push(`/partner/referrals/${r.id}`)}
      />

      <ReferContactDialog
        commissionRate={summary?.commissionRate ?? null}
        open={referOpen}
        onOpenChange={setReferOpen}
      />
    </div>
  );
}
