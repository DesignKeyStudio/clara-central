"use client";

import type { Column, ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { SortableHeader } from "@/components/data-table";
import type { PartnerPayoutRow } from "@/lib/services/payout-service";
import { formatCurrency } from "@/lib/utils";

const fmtDate = (iso: string) => format(parseISO(iso), "MMM d, yyyy");

/** Sortable, uppercase-muted column header (C-12). */
function sortable(label: string, align: "left" | "right" = "left") {
  return function SortHeader({ column }: { column: Column<PartnerPayoutRow, unknown> }) {
    return (
      <SortableHeader column={column} align={align}>
        {label}
      </SortableHeader>
    );
  };
}

export const partnerPayoutColumns: ColumnDef<PartnerPayoutRow>[] = [
  {
    accessorKey: "paidAt",
    header: sortable("Date"),
    cell: ({ row }) => <span className="text-muted-foreground">{fmtDate(row.original.paidAt)}</span>,
  },
  {
    accessorKey: "amount",
    header: sortable("Amount"),
    cell: ({ row }) => (
      <div className="font-medium tabular-nums text-success">
        {formatCurrency(row.original.amount)}
      </div>
    ),
  },
  {
    accessorKey: "note",
    header: sortable("Note"),
    cell: ({ row }) =>
      row.original.note ? (
        <div className="max-w-[360px] truncate" title={row.original.note}>
          {row.original.note}
        </div>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
];
