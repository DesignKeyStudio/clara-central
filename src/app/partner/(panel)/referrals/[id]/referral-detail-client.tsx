"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { ChevronLeft, Coins, DollarSign, Info, Receipt, Trash2, Wallet } from "lucide-react";
import { KpiCard } from "@/components/custom/kpi-card";
import { ContractStatus } from "@/components/custom/contract-status";
import { StatusBadge } from "@/components/custom/status-badge";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyReferral } from "@/lib/queries/hooks";
import { DeleteMyReferralDialog } from "../../delete-my-referral-dialog";
import type { ReferralInvoiceRow } from "@/lib/services/referral-service";
import { commissionStateMeta, invoiceStatusMeta, referralStatusMeta } from "@/lib/status-meta";
import { cn, externalHref, formatCurrency, telHref } from "@/lib/utils";

const fmtDate = (iso: string) => format(parseISO(iso), "MMM d, yyyy");

function th(label: string, align: "left" | "right" = "left") {
  return function HeaderCell() {
    return (
      <span
        className={cn(
          "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
          align === "right" && "block w-full text-right",
        )}
      >
        {label}
      </span>
    );
  };
}

/** Read-only invoice columns for the partner view — no inline status menu or actions. */
const invoiceColumns: ColumnDef<ReferralInvoiceRow>[] = [
  {
    accessorKey: "id",
    header: th("Invoice ID"),
    cell: ({ row }) => <span className="font-medium">{row.original.id}</span>,
  },
  {
    accessorKey: "amount",
    header: th("Amount"),
    cell: ({ row }) => (
      <div className="font-medium tabular-nums">{formatCurrency(row.original.amount)}</div>
    ),
  },
  {
    accessorKey: "status",
    header: th("Status"),
    cell: ({ row }) => <StatusBadge {...invoiceStatusMeta(row.original.status)} />,
  },
  {
    accessorKey: "commission",
    header: th("Commission"),
    // $0-contributing invoices (unpaid or outside the window) render a muted
    // "—" rather than an overstated $0.00, matching the admin invoices table.
    cell: ({ row }) =>
      row.original.commission > 0 ? (
        <div className="font-medium tabular-nums text-success">
          {formatCurrency(row.original.commission)}
        </div>
      ) : (
        <div className="text-muted-foreground">—</div>
      ),
  },
  {
    accessorKey: "addedAt",
    header: th("Issued"),
    cell: ({ row }) => fmtDate(row.original.addedAt),
  },
  {
    accessorKey: "paidDate",
    header: th("Paid"),
    cell: ({ row }) =>
      row.original.paidDate ? (
        fmtDate(row.original.paidDate)
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: "publicNote",
    header: th("Note"),
    cell: ({ row }) =>
      row.original.publicNote ? (
        <span className="block max-w-[16rem] truncate" title={row.original.publicNote}>
          {row.original.publicNote}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
];

function BackLink() {
  return (
    <Link
      href="/partner"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ChevronLeft className="size-4" />
      Back to my referrals
    </Link>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-sm break-words">{children}</div>
    </div>
  );
}

export function PartnerReferralDetailClient({ referralId }: { referralId: string }) {
  const { data: referral, isLoading } = useMyReferral(referralId);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-16 w-72" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!referral) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-muted-foreground">Referral not found.</p>
      </div>
    );
  }

  const status = referralStatusMeta(referral.status);
  const windowMeta = commissionStateMeta(referral.commissionState);
  const subtitle = [referral.contactCompany, `referred ${fmtDate(referral.createdAt)}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      <BackLink />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight break-words">{referral.contactName}</h1>
            <StatusBadge label={status.label} tone={status.tone} />
          </div>
          <p className="text-muted-foreground break-words">{subtitle}</p>
        </div>
        {/* A partner can delete their referral only while it's still Submitted; once it
            moves further along the button is shown disabled with an explanatory tooltip. */}
        {referral.status === "submitted" ? (
          <Button
            variant="outline"
            className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              {/* Wrapper span keeps the tooltip working even though the button is disabled. */}
              <span tabIndex={0} className="shrink-0">
                <Button variant="outline" className="text-muted-foreground" disabled>
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Only referrals still in the Submitted stage can be deleted.
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <DeleteMyReferralDialog
        referralId={referral.id}
        contactName={referral.contactName}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        redirectTo="/partner"
      />

      {/* Info card */}
      <Card>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
            <Field label="Contact">
              <span className="font-medium">{referral.contactName}</span>
            </Field>
            <Field label="Email">
              {referral.contactEmail ? (
                <a href={`mailto:${referral.contactEmail}`} className="hover:underline">
                  {referral.contactEmail}
                </a>
              ) : (
                "—"
              )}
            </Field>
            <Field label="Phone">
              {referral.contactPhone ? (
                <a href={telHref(referral.contactPhone)} className="hover:underline">
                  {referral.contactPhone}
                </a>
              ) : (
                "—"
              )}
            </Field>
            <Field label="Company">{referral.contactCompany ?? "—"}</Field>
            <Field label="Website">
              {referral.contactWebsite ? (
                <a
                  href={externalHref(referral.contactWebsite)}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline"
                >
                  {referral.contactWebsite}
                </a>
              ) : (
                "—"
              )}
            </Field>
            <Field label="Commission rate">
              <span className="font-medium tabular-nums">{referral.commissionRate}%</span>
            </Field>
            <Field label="Commission window">
              <div className="flex flex-wrap items-center gap-2">
                <ContractStatus
                  label={windowMeta.label}
                  tone={windowMeta.tone}
                  detail={`${windowMeta.datePrefix} ${fmtDate(referral.commissionUntil)}`}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="How the commission window is set"
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Info className="size-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {referral.commissionValidMonths} months from the referral date
                  </TooltipContent>
                </Tooltip>
              </div>
            </Field>
          </div>

          {referral.notes && (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="text-sm break-words">{referral.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total invoices" value={`${referral.invoiceCount}`} icon={Receipt} />
        <KpiCard label="Total invoiced" value={formatCurrency(referral.totalInvoiced)} icon={DollarSign} />
        <KpiCard label="Total paid" value={formatCurrency(referral.totalPaid)} icon={Wallet} />
        <KpiCard
          label="Commission earned"
          value={formatCurrency(referral.commissionEarned)}
          subtitle={`${formatCurrency(referral.commissionPaid)} paid out`}
          icon={Coins}
          iconClassName="bg-success/10"
          linkLabel="History"
          linkHref="/partner/payouts"
        />
      </div>

      {/* Invoices */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Invoices</h2>
        <DataTable
          columns={invoiceColumns}
          data={referral.invoices}
          showPagination={false}
          emptyMessage="No invoices on this referral yet."
        />
      </div>
    </div>
  );
}
