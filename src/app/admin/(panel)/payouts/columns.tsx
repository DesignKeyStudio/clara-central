"use client";

import { useState } from "react";
import Link from "next/link";
import type { Column, ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SortableHeader } from "@/components/data-table";
import { useDeletePayout } from "@/lib/queries/hooks";
import type { PayoutListRow } from "@/lib/services/payout-service";
import { cn, formatCurrency } from "@/lib/utils";
import { EditPayoutDialog } from "./edit-payout-dialog";

const fmtDate = (iso: string) => format(parseISO(iso), "MMM d, yyyy");

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

/** Sortable, uppercase-muted column header (C-12). */
function sortable(label: string, align: "left" | "right" = "left") {
  return function SortHeader({ column }: { column: Column<PayoutListRow, unknown> }) {
    return (
      <SortableHeader column={column} align={align}>
        {label}
      </SortableHeader>
    );
  };
}

/** Edit / delete actions for one payout row. */
function PayoutActionsCell({ payout }: { payout: PayoutListRow }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const del = useDeletePayout(payout.partnerId, payout.referralId);

  const onConfirmDelete = () => {
    del.mutate(payout.id, {
      onSuccess: () => {
        toast.success("Payout deleted");
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
            <span className="sr-only">Payout actions</span>
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

      <EditPayoutDialog payout={payout} open={editOpen} onOpenChange={setEditOpen} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this payout?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the {formatCurrency(payout.amount)} payout to {payout.partnerName} and
              returns it to their outstanding balance. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onConfirmDelete} disabled={del.isPending}>
              {del.isPending ? "Deleting…" : "Delete payout"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export const payoutColumns: ColumnDef<PayoutListRow>[] = [
  {
    accessorKey: "paidAt",
    header: sortable("Date"),
    cell: ({ row }) => fmtDate(row.original.paidAt),
  },
  {
    accessorKey: "partnerName",
    header: sortable("Partner"),
    cell: ({ row }) => (
      <Link
        href={`/admin/partners/${row.original.partnerId}`}
        className="block max-w-[220px] truncate font-medium hover:underline"
        title={row.original.partnerName}
      >
        {row.original.partnerName}
      </Link>
    ),
  },
  {
    accessorKey: "amount",
    header: sortable("Amount"),
    cell: ({ row }) => (
      <div className="font-medium tabular-nums">
        {formatCurrency(row.original.amount)}
      </div>
    ),
  },
  {
    accessorKey: "noteToPartner",
    header: sortable("Note to partner"),
    cell: ({ row }) => (
      <div className="max-w-[220px] truncate" title={row.original.noteToPartner ?? undefined}>
        {row.original.noteToPartner}
      </div>
    ),
  },
  {
    accessorKey: "privateNote",
    header: sortable("Private note"),
    cell: ({ row }) => (
      <div
        className="max-w-[180px] truncate text-muted-foreground"
        title={row.original.privateNote ?? undefined}
      >
        {row.original.privateNote}
      </div>
    ),
  },
  {
    id: "actions",
    header: th("", "right"),
    enableSorting: false,
    cell: ({ row }) => <PayoutActionsCell payout={row.original} />,
  },
];
