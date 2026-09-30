"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { ContractStatus } from "@/components/custom/contract-status";
import { StatusBadge } from "@/components/custom/status-badge";
import type { PartnerReferralRow } from "@/lib/services/partner-service";
import { commissionStateMeta, referralStatusMeta } from "@/lib/status-meta";
import { cn } from "@/lib/utils";

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

export const referralColumns: ColumnDef<PartnerReferralRow>[] = [
  {
    accessorKey: "contactName",
    header: th("Contact"),
    cell: ({ row }) => (
      <span className="block max-w-[160px] truncate font-medium" title={row.original.contactName}>
        {row.original.contactName}
      </span>
    ),
  },
  {
    accessorKey: "contactEmail",
    header: th("Email"),
    cell: ({ row }) =>
      row.original.contactEmail ? (
        <a
          href={`mailto:${row.original.contactEmail}`}
          className="block max-w-[180px] truncate hover:underline"
          title={row.original.contactEmail}
          onClick={(e) => e.stopPropagation()}
        >
          {row.original.contactEmail}
        </a>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: "contactCompany",
    header: th("Company"),
    cell: ({ row }) =>
      row.original.contactCompany ? (
        <span className="block max-w-[140px] truncate" title={row.original.contactCompany}>
          {row.original.contactCompany}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: "status",
    header: th("Referral Status"),
    cell: ({ row }) => <StatusBadge {...referralStatusMeta(row.original.status)} />,
  },
  {
    id: "commission",
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
    accessorKey: "commissionRate",
    header: th("Comm %"),
    cell: ({ row }) => <span className="font-medium tabular-nums">{row.original.commissionRate}%</span>,
  },
  {
    accessorKey: "createdAt",
    header: th("Date"),
    cell: ({ row }) => fmtDate(row.original.createdAt),
  },
];
