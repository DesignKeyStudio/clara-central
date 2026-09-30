"use client";

import Link from "next/link";
import type { Column, ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { ContractStatus } from "@/components/custom/contract-status";
import { StatusBadge } from "@/components/custom/status-badge";
import { SortableHeader } from "@/components/data-table";
import type { ReferralListRow } from "@/lib/services/referral-service";
import { commissionStateMeta, referralStatusMeta } from "@/lib/status-meta";
import { cn, formatCurrency } from "@/lib/utils";

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
  return function SortHeader({ column }: { column: Column<ReferralListRow, unknown> }) {
    return (
      <SortableHeader column={column} align={align}>
        {label}
      </SortableHeader>
    );
  };
}

export const referralColumns: ColumnDef<ReferralListRow>[] = [
  {
    accessorKey: "partnerName",
    header: sortable("Partner"),
    cell: ({ row }) => (
      <Link
        href={`/admin/partners/${row.original.partnerId}`}
        className="block max-w-[180px] truncate font-medium hover:underline"
        title={row.original.partnerName}
        onClick={(e) => e.stopPropagation()}
      >
        {row.original.partnerName}
      </Link>
    ),
  },
  {
    accessorKey: "contactName",
    header: sortable("Contact"),
    cell: ({ row }) => (
      <div className="min-w-0 max-w-[180px]">
        <p className="truncate font-medium" title={row.original.contactName}>
          {row.original.contactName}
        </p>
        {row.original.contactCompany && (
          <p className="truncate text-sm text-muted-foreground" title={row.original.contactCompany}>
            {row.original.contactCompany}
          </p>
        )}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: sortable("Referral Status"),
    cell: ({ row }) => <StatusBadge {...referralStatusMeta(row.original.status)} />,
  },
  {
    id: "state",
    header: th("Contract Status"),
    cell: ({ row }) => {
      const meta = commissionStateMeta(row.original.commissionState);
      return (
        <ContractStatus
          label={meta.label}
          tone={meta.tone}
          detail={`${meta.datePrefix} ${fmtDate(row.original.commissionUntil)}`}
        />
      );
    },
  },
  {
    accessorKey: "earned",
    header: sortable("Earned"),
    cell: ({ row }) =>
      row.original.earned ? (
        <span className="font-medium tabular-nums text-success">
          {formatCurrency(row.original.earned)}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: "createdAt",
    header: sortable("Date"),
    cell: ({ row }) => fmtDate(row.original.createdAt),
  },
];
