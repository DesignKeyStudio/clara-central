"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import type { invoice_status, referral_status } from "@prisma/client";
import { format, parseISO } from "date-fns";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  Coins,
  DollarSign,
  Info,
  Plus,
  Receipt,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { KpiCard } from "@/components/custom/kpi-card";
import { ContractStatus } from "@/components/custom/contract-status";
import { StatusBadge } from "@/components/custom/status-badge";
import { TimeRangeSelect } from "@/components/custom/time-range-select";
import { DataTable } from "@/components/data-table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useReferral, useSetContractEnded, useUpdateReferralStatus } from "@/lib/queries/hooks";
import type { ReferralDetail } from "@/lib/services/referral-service";
import { commissionStateMeta, invoiceStatusMeta, referralStatusMeta } from "@/lib/status-meta";
import {
  cn,
  externalHref,
  formatCurrency,
  telHref,
  withinTimeRange,
  type TimeRange,
} from "@/lib/utils";
import { AddInvoiceDialog } from "./add-invoice-dialog";
import { DeleteReferralDialog } from "./delete-referral-dialog";
import { RecordPaymentDialog } from "./record-payment-dialog";
import { getInvoiceColumns } from "./invoice-columns";

/** All referral pipeline statuses, in funnel order — for the status menu. */
const REFERRAL_STATUSES: referral_status[] = [
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

const fmtDate = (iso: string) => format(parseISO(iso), "MMM d, yyyy");

type InvoiceStatusFilter = invoice_status | "all";

function BackLink() {
  return (
    <Link
      href="/admin/referrals"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ChevronLeft className="size-4" />
      Back to referrals
    </Link>
  );
}

/** A labelled value in the info card. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-sm break-words">{children}</div>
    </div>
  );
}

/**
 * Interactive referral-status pill. Per the DESIGN rule, a record's status sits
 * at the header level next to the title — so this renders there, not in the
 * action cluster. Clicking it opens the status menu.
 */
function ReferralStatusMenu({ referral }: { referral: ReferralDetail }) {
  const statusMut = useUpdateReferralStatus(referral.id, referral.partnerId);
  const status = referralStatusMeta(referral.status);

  const changeStatus = (next: referral_status) => {
    if (next === referral.status) return;
    statusMut.mutate(next, {
      onSuccess: () => toast.success("Status updated"),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Change referral status"
        disabled={statusMut.isPending}
        className="inline-flex items-center gap-1 rounded-md transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        <StatusBadge label={status.label} tone={status.tone} />
        <ChevronDown className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {REFERRAL_STATUSES.map((s) => {
          const current = s === referral.status;
          return (
            <DropdownMenuItem
              key={s}
              onSelect={() => changeStatus(s)}
              className={cn("gap-2", current && "bg-accent")}
            >
              <StatusBadge {...referralStatusMeta(s)} />
              {current && <Check className="ml-auto size-4 text-foreground" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Header action cluster (contract toggle, add-invoice, record-payment). Split
 * into its own component so the mutation hooks can key off the loaded ids.
 */
function ReferralHeaderActions({ referral }: { referral: ReferralDetail }) {
  const [addOpen, setAddOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const contractMut = useSetContractEnded(referral.id, referral.partnerId);
  const ended = referral.commissionState === "contract_ended";
  const owed = referral.commissionEarned - referral.commissionPaid;
  const today = format(new Date(), "MMM d, yyyy");

  const reopenContract = () =>
    contractMut.mutate(false, {
      onSuccess: () => toast.success("Contract reopened"),
      onError: (e) => toast.error(e.message),
    });

  const confirmEndContract = () =>
    contractMut.mutate(true, {
      onSuccess: () => {
        toast.success("Contract marked as ended");
        setEndConfirmOpen(false);
      },
      onError: (e) => toast.error(e.message),
    });

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {ended ? (
        <Button variant="outline" disabled={contractMut.isPending} onClick={reopenContract}>
          <Check className="size-4" />
          Reopen Contract
        </Button>
      ) : (
        <Button variant="outline" disabled={contractMut.isPending} onClick={() => setEndConfirmOpen(true)}>
          <X className="size-4" />
          Mark Contract Ended
        </Button>
      )}
      <Button
        variant="outline"
        disabled={owed <= 0}
        title={owed <= 0 ? "No unpaid commission to pay out" : undefined}
        onClick={() => setPayOpen(true)}
      >
        <Wallet className="size-4" />
        Record Payment
      </Button>
      <Button onClick={() => setAddOpen(true)}>
        <Plus className="size-4" />
        Add Invoice
      </Button>
      <Button
        variant="outline"
        className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 className="size-4" />
        Delete
      </Button>
      <AddInvoiceDialog referral={referral} open={addOpen} onOpenChange={setAddOpen} />
      <RecordPaymentDialog referral={referral} open={payOpen} onOpenChange={setPayOpen} />
      <DeleteReferralDialog
        referralId={referral.id}
        partnerId={referral.partnerId}
        contactName={referral.contactName}
        invoiceCount={referral.invoiceCount}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />

      <AlertDialog open={endConfirmOpen} onOpenChange={setEndConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark contract ended?</AlertDialogTitle>
            <AlertDialogDescription>
              This sets the contract end date to today ({today}) and closes the commission window —
              invoices issued after today won&apos;t earn commission. You can reopen it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmEndContract} disabled={contractMut.isPending}>
              {contractMut.isPending ? "Marking…" : "Mark Contract Ended"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function ReferralDetailClient({ referralId }: { referralId: string }) {
  const { data: referral, isLoading } = useReferral(referralId);
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatusFilter>("all");
  const [invoiceRange, setInvoiceRange] = useState<TimeRange>("any");

  const filteredInvoices = useMemo(() => {
    if (!referral) return [];
    return referral.invoices.filter((inv) => {
      if (invoiceStatus !== "all" && inv.status !== invoiceStatus) return false;
      return withinTimeRange(inv.addedAt, invoiceRange);
    });
  }, [referral, invoiceStatus, invoiceRange]);

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

  const windowMeta = commissionStateMeta(referral.commissionState);
  const subtitle = [
    referral.contactCompany,
    `referred ${fmtDate(referral.createdAt)}`,
    `by ${referral.partnerName}`,
  ]
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
            <ReferralStatusMenu referral={referral} />
          </div>
          <p className="text-muted-foreground break-words">{subtitle}</p>
        </div>
        <ReferralHeaderActions referral={referral} />
      </div>

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
            <Field label="Referred by">
              <Link href={`/admin/partners/${referral.partnerId}`} className="hover:underline">
                {referral.partnerName}
              </Link>
              {referral.partnerCompany && (
                <span className="text-muted-foreground"> · {referral.partnerCompany}</span>
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
        <KpiCard
          label="Total invoiced"
          value={formatCurrency(referral.totalInvoiced)}
          icon={DollarSign}
        />
        <KpiCard label="Total paid" value={formatCurrency(referral.totalPaid)} icon={Wallet} />
        <KpiCard
          label="Commission earned"
          value={formatCurrency(referral.commissionEarned)}
          subtitle={`${formatCurrency(referral.commissionPaid)} paid out`}
          icon={Coins}
          linkLabel="History"
          linkHref="/admin/payouts"
        />
      </div>

      {/* Client invoices */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Client invoices</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={invoiceStatus}
              onValueChange={(v) => setInvoiceStatus(v as InvoiceStatusFilter)}
            >
              <SelectTrigger className="w-[150px]" aria-label="Filter invoices by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">{invoiceStatusMeta("draft").label}</SelectItem>
                <SelectItem value="sent">{invoiceStatusMeta("sent").label}</SelectItem>
                <SelectItem value="paid">{invoiceStatusMeta("paid").label}</SelectItem>
              </SelectContent>
            </Select>
            <TimeRangeSelect
              value={invoiceRange}
              onChange={setInvoiceRange}
              ariaLabel="Filter invoices by issue date"
            />
          </div>
        </div>
        <DataTable
          columns={getInvoiceColumns({ referral })}
          data={filteredInvoices}
          showPagination={false}
          emptyMessage={
            referral.invoices.length === 0
              ? "No invoices on this referral yet."
              : "No invoices match your filters."
          }
        />
      </div>
    </div>
  );
}
