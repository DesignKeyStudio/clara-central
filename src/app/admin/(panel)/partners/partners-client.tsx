"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, DollarSign, Plus, Search, UserCheck, Users } from "lucide-react";
import { KpiCard } from "@/components/custom/kpi-card";
import { PageHeader } from "@/components/custom/page-header";
import { TimeRangeSelect } from "@/components/custom/time-range-select";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePartners } from "@/lib/queries/hooks";
import { formatCurrency, withinTimeRange, type TimeRange } from "@/lib/utils";
import { partnerColumns } from "./columns";
import { InvitationsSection } from "./invitations-section";
import { InvitePartnerDialog } from "./invite-partner-dialog";
import { PendingApplications } from "./pending-applications";

export function PartnersClient() {
  const router = useRouter();
  const { data: partners = [], isLoading } = usePartners();
  const [search, setSearch] = useState("");
  const [showRejected, setShowRejected] = useState(false);
  const [range, setRange] = useState<TimeRange>("any");
  const [inviteOpen, setInviteOpen] = useState(false);

  const pending = useMemo(
    () => partners.filter((p) => p.status === "pending"),
    [partners],
  );

  // The main list is approved partners by default; "Show rejected" flips it to
  // rejected-only. Pending applications live in their own section above.
  const base = useMemo(
    () =>
      partners.filter((p) => (showRejected ? p.status === "rejected" : p.status === "approved")),
    [partners, showRejected],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return base.filter((p) => {
      if (!withinTimeRange(p.joinedAt, range)) return false;
      if (!q) return true;
      return (
        p.fullName.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.companyName.toLowerCase().includes(q)
      );
    });
  }, [base, search, range]);

  const approvedCount = useMemo(
    () => partners.filter((p) => p.status === "approved").length,
    [partners],
  );
  const totalCommissionPaid = useMemo(
    () => partners.reduce((sum, p) => sum + p.commissionPaid, 0),
    [partners],
  );

  const emptyMessage =
    search.trim() || range !== "any"
      ? "No partners match your filters."
      : showRejected
        ? "No rejected partners."
        : "No approved partners yet.";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Partners"
        subtitle="Everyone in the referral program."
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <Plus className="size-4" />
            Invite Partner
          </Button>
        }
      />

      <InvitePartnerDialog open={inviteOpen} onOpenChange={setInviteOpen} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total partners" value={`${partners.length}`} icon={Users} />
        <KpiCard label="Approved" value={`${approvedCount}`} icon={UserCheck} />
        <KpiCard label="Pending" value={`${pending.length}`} icon={Clock} />
        <KpiCard
          label="Total commission paid"
          value={formatCurrency(totalCommissionPaid)}
          icon={DollarSign}
        />
      </div>

      <PendingApplications partners={pending} />

      <InvitationsSection />

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, or company…"
            className="pl-9"
            aria-label="Search partners"
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="show-rejected"
            checked={showRejected}
            onCheckedChange={(v) => setShowRejected(v === true)}
          />
          <Label htmlFor="show-rejected" className="whitespace-nowrap">
            Show rejected
          </Label>
        </div>
        <TimeRangeSelect
          value={range}
          onChange={setRange}
          ariaLabel="Filter partners by joined date"
        />
        <span className="shrink-0 text-sm text-muted-foreground">
          {filtered.length} of {base.length}
        </span>
      </div>

      <DataTable
        columns={partnerColumns}
        data={filtered}
        isLoading={isLoading}
        pageSize={25}
        emptyMessage={emptyMessage}
        onRowClick={(p) => router.push(`/admin/partners/${p.id}`)}
      />
    </div>
  );
}
