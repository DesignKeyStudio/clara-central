"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { invoice_status } from "@prisma/client";
import { format, parseISO } from "date-fns";
import { Check, ChevronDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/custom/status-badge";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DatePicker } from "@/components/custom/date-picker";
import { Label } from "@/components/ui/label";
import { useDeleteInvoice, useSetInvoiceStatus } from "@/lib/queries/hooks";
import type { ReferralDetail, ReferralInvoiceRow } from "@/lib/services/referral-service";
import { invoiceStatusMeta } from "@/lib/status-meta";
import { cn, formatCurrency, todayLocalDate } from "@/lib/utils";
import { EditInvoiceDialog } from "./edit-invoice-dialog";

const fmtDate = (iso: string) => format(parseISO(iso), "MMM d, yyyy");
// Local YYYY-MM-DD — NOT `toISOString().slice(0,10)`, which is the UTC date and
// would default/clamp the paid date a day ahead for users west of UTC.
const todayStr = todayLocalDate;

const INVOICE_STATUSES: invoice_status[] = ["draft", "sent", "paid"];

/** Uppercase, muted column header to match the prototype. */
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

/** Inline, admin-editable invoice status — a badge that opens a status menu. */
function InvoiceStatusCell({
  invoice,
  referralId,
  partnerId,
}: {
  invoice: ReferralInvoiceRow;
  referralId: string;
  partnerId: string;
}) {
  const setStatus = useSetInvoiceStatus(referralId, partnerId);
  const meta = invoiceStatusMeta(invoice.status);
  // Marking an invoice paid prompts for the paid date (INV-4); other transitions are immediate.
  const [paidOpen, setPaidOpen] = useState(false);
  const [paidDate, setPaidDate] = useState(todayStr());

  const apply = (status: invoice_status, date?: string) =>
    setStatus.mutate(
      { invoiceId: invoice.invoiceId, status, paidDate: date },
      {
        onSuccess: () => {
          toast.success("Invoice updated");
          setPaidOpen(false);
        },
        onError: (e) => toast.error(e.message),
      },
    );

  const onSelect = (s: invoice_status) => {
    if (s === "paid" && invoice.status !== "paid") {
      setPaidDate(invoice.paidDate ?? todayStr());
      setPaidOpen(true);
      return;
    }
    apply(s);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={setStatus.isPending}
          className="inline-flex items-center gap-1 rounded-md transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          <StatusBadge label={meta.label} tone={meta.tone} />
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {INVOICE_STATUSES.map((s) => {
            const current = s === invoice.status;
            return (
              <DropdownMenuItem
                key={s}
                onSelect={() => onSelect(s)}
                className={cn("gap-2", current && "bg-accent")}
              >
                <StatusBadge {...invoiceStatusMeta(s)} />
                {current && <Check className="ml-auto size-4 text-foreground" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={paidOpen} onOpenChange={setPaidOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark invoice {invoice.id} paid</DialogTitle>
            <DialogDescription>
              When was this invoice paid? This date anchors the commission window.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="paid-date">Paid date *</Label>
            <DatePicker
              id="paid-date"
              value={paidDate}
              onChange={setPaidDate}
              max={todayStr()}
              aria-label="Paid date"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaidOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => apply("paid", paidDate)} disabled={setStatus.isPending || !paidDate}>
              {setStatus.isPending ? "Saving…" : "Mark Paid"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Edit / delete actions for one invoice row (admin only). */
function InvoiceActionsCell({
  invoice,
  referral,
}: {
  invoice: ReferralInvoiceRow;
  referral: ReferralDetail;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const del = useDeleteInvoice(referral.id, referral.partnerId);

  const onConfirmDelete = () => {
    del.mutate(invoice.invoiceId, {
      onSuccess: () => {
        toast.success("Invoice deleted");
        setDeleteOpen(false);
      },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div className="text-right">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Invoice actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="size-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditInvoiceDialog
        referral={referral}
        invoice={invoice}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete invoice {invoice.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the invoice and recomputes the partner&apos;s commission. This can&apos;t be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onConfirmDelete} disabled={del.isPending}>
              {del.isPending ? "Deleting…" : "Delete invoice"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * Column defs for a referral's "Client invoices" table. In the admin view, status
 * is editable inline and an Actions column offers edit/delete. Pass `readOnly` (the
 * partner portal) for a plain status badge and no actions.
 */
export function getInvoiceColumns({
  referral,
  readOnly = false,
}: {
  referral: ReferralDetail;
  readOnly?: boolean;
}): ColumnDef<ReferralInvoiceRow>[] {
  const columns: ColumnDef<ReferralInvoiceRow>[] = [
    {
      accessorKey: "id",
      header: th("Invoice ID"),
      cell: ({ row }) => <span className="font-medium">{row.original.id}</span>,
    },
    {
      accessorKey: "amount",
      header: th("Amount"),
      cell: ({ row }) => (
        <div className="font-medium tabular-nums">
          {formatCurrency(row.original.amount)}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: th("Status"),
      cell: ({ row }) =>
        readOnly ? (
          <StatusBadge {...invoiceStatusMeta(row.original.status)} />
        ) : (
          <InvoiceStatusCell
            invoice={row.original}
            referralId={referral.id}
            partnerId={referral.partnerId}
          />
        ),
    },
    {
      accessorKey: "commission",
      header: th("Commission"),
      // Shows the actual earned commission: $0-contributing invoices (unpaid or
      // outside the window) render a muted "—" rather than an overstated amount.
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
      header: th("Note to partner"),
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

  if (!readOnly) {
    columns.push({
      id: "actions",
      header: th("", "right"),
      cell: ({ row }) => <InvoiceActionsCell invoice={row.original} referral={referral} />,
    });
  }

  return columns;
}
