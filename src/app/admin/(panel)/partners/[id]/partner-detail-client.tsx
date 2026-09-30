"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  Coins,
  DollarSign,
  ListChecks,
  Pencil,
  Receipt,
  Trash2,
  Wallet,
} from "lucide-react";
import { KpiCard } from "@/components/custom/kpi-card";
import { StatusBadge } from "@/components/custom/status-badge";
import { UserAvatar } from "@/components/custom/user-avatar";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { usePartner } from "@/lib/queries/hooks";
import { partnerStatusMeta } from "@/lib/status-meta";
import { formatCurrency, getInitials } from "@/lib/utils";
import { DeletePartnerDialog } from "./delete-partner-dialog";
import { EditPartnerDialog } from "./edit-partner-dialog";
import { PartnerStatusDialog } from "../partner-status-dialog";
import { RecordPayoutDialog } from "./record-payout-dialog";
import { referralColumns } from "./referral-columns";

const fmtDate = (iso: string) => format(parseISO(iso), "MMM d, yyyy");
const fmtDateTime = (iso: string) => format(parseISO(iso), "MMM d, yyyy, h:mm a");

function BackLink() {
  return (
    <Link
      href="/admin/partners"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ChevronLeft className="size-4" />
      Back to partners
    </Link>
  );
}

/** A labelled value in the info card, with an optional inline action (e.g. Edit). */
function Field({
  label,
  action,
  children,
}: {
  label: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex items-center gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {action}
      </div>
      <div className="text-sm break-words">{children}</div>
    </div>
  );
}

export function PartnerDetailClient({ partnerId }: { partnerId: string }) {
  const router = useRouter();
  const { data: partner, isLoading } = usePartner(partnerId);
  const [editOpen, setEditOpen] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusAction, setStatusAction] = useState<"approve" | "reject" | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-16 w-72" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-muted-foreground">Partner not found.</p>
      </div>
    );
  }

  const status = partnerStatusMeta(partner.status);
  const subtitle = [partner.role, partner.companyName, partner.location].filter(Boolean).join(" · ");

  return (
    <div className="space-y-6">
      <BackLink />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <UserAvatar
            initials={getInitials(partner.fullName)}
            size="lg"
            imageUrl={partner.avatarUrl}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="min-w-0 break-words text-2xl font-bold tracking-tight">{partner.fullName}</h1>
              <StatusBadge label={status.label} tone={status.tone} className="shrink-0" />
            </div>
            {subtitle && <p className="break-words text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Pending actions grouped: destructive Reject, then primary Approve. */}
          {partner.status === "pending" && (
            <>
              <Button
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setStatusAction("reject")}
              >
                Reject
              </Button>
              <Button variant="success" onClick={() => setStatusAction("approve")}>
                <Check className="size-4" />
                Approve
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Edit Partner
          </Button>
          <Button
            onClick={() => setPayoutOpen(true)}
            disabled={partner.commissionOwed <= 0}
            title={partner.commissionOwed <= 0 ? "No unpaid commission to pay out" : undefined}
          >
            <Receipt className="size-4" />
            Record Payout
          </Button>
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </div>

      <PartnerStatusDialog
        partnerId={partner.id}
        partnerName={partner.fullName}
        mode={statusAction ?? "approve"}
        open={statusAction !== null}
        onOpenChange={(o) => !o && setStatusAction(null)}
      />

      {/* Info card */}
      <Card>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4 lg:grid-cols-4">
            <Field label="Email">
              <a href={`mailto:${partner.email}`} className="break-all hover:underline">
                {partner.email}
              </a>
            </Field>
            <Field label="Phone">{partner.phone ?? "—"}</Field>
            <Field label="Website">
              {partner.website ? (
                <a href={partner.website} className="break-all hover:underline">
                  {partner.website}
                </a>
              ) : (
                "—"
              )}
            </Field>
            <Field
              label="Commission rate"
              action={
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Edit
                </button>
              }
            >
              <span className="font-medium tabular-nums">{partner.commissionRate}%</span>
            </Field>
            <Field label="Entry type">
              <Badge variant="secondary" className="font-medium">
                {partner.entryType === "self_signup" ? "Self Sign-Up" : "Invited"}
              </Badge>
            </Field>
            <Field label="Joined">{fmtDate(partner.joinedAt)}</Field>
            <Field label="Last login">
              {partner.lastLoginAt ? fmtDateTime(partner.lastLoginAt) : "—"}
            </Field>
          </div>

          {(partner.howDidYouHear || partner.typesOfReferrals) && (
            <>
              <Separator />
              <div className="space-y-4">
                {partner.howDidYouHear && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">How did you hear about us?</p>
                    <p className="text-sm break-words">{partner.howDidYouHear}</p>
                  </div>
                )}
                {partner.typesOfReferrals && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      What types of businesses or contacts would you typically refer to us?
                    </p>
                    <p className="text-sm break-words">{partner.typesOfReferrals}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Referrals" value={`${partner.referralCount}`} icon={ListChecks} />
        <KpiCard label="Conversions" value={`${partner.conversionsCount}`} icon={CheckCircle2} />
        <KpiCard
          label="Commission earned"
          value={formatCurrency(partner.commissionEarned)}
          icon={DollarSign}
        />
        <KpiCard
          label="Commission paid"
          value={formatCurrency(partner.commissionPaid)}
          icon={Wallet}
        />
        <KpiCard
          label="Commission owed"
          value={formatCurrency(partner.commissionOwed)}
          icon={Coins}
        />
      </div>

      {/* Their referrals */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Their referrals</h2>
        <DataTable
          columns={referralColumns}
          data={partner.referrals}
          showPagination={false}
          emptyMessage="No referrals yet."
          onRowClick={(r) => router.push(`/admin/referrals/${r.id}`)}
        />
      </div>

      <EditPartnerDialog partner={partner} open={editOpen} onOpenChange={setEditOpen} />
      <RecordPayoutDialog partner={partner} open={payoutOpen} onOpenChange={setPayoutOpen} />
      <DeletePartnerDialog
        partnerId={partner.id}
        partnerName={partner.fullName}
        referralCount={partner.referralCount}
        invoiceCount={partner.invoiceCount}
        payoutCount={partner.payoutCount}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}
