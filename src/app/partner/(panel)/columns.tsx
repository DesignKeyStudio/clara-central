"use client";

import { useState } from "react";
import type { Column, ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { Trash2 } from "lucide-react";
import { ContractStatus } from "@/components/custom/contract-status";
import { StatusBadge } from "@/components/custom/status-badge";
import { SortableHeader } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { PartnerReferralListRow } from "@/lib/services/referral-service";
import { commissionStateMeta, referralStatusMeta } from "@/lib/status-meta";
import { cn, formatCurrency } from "@/lib/utils";
import { DeleteMyReferralDialog } from "./delete-my-referral-dialog";

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
  return function SortHeader({ column }: { column: Column<PartnerReferralListRow, unknown> }) {
    return (
      <SortableHeader column={column} align={align}>
        {label}
      </SortableHeader>
    );
  };
}

const dash = <span className="text-muted-foreground">—</span>;

/**
 * Row action: a partner may delete their own referral only while it's still in the
 * Submitted stage. Once it moves further along, the trash button is shown disabled
 * with a tooltip explaining why. Stops row-click propagation so the button doesn't
 * also navigate to the detail page.
 */
function ReferralRowActions({ referral }: { referral: PartnerReferralListRow }) {
  const [open, setOpen] = useState(false);
  const canDelete = referral.status === "submitted";

  if (!canDelete) {
    return (
      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
        <Tooltip>
          <TooltipTrigger asChild>
            {/* Wrapper span keeps the tooltip working even though the button is disabled. */}
            <span tabIndex={0}>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground"
                aria-label={`Delete referral for ${referral.contactName}`}
                disabled
              >
                <Trash2 className="size-4" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            Only referrals still in the Submitted stage can be deleted.
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        aria-label={`Delete referral for ${referral.contactName}`}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4" />
      </Button>
      <DeleteMyReferralDialog
        referralId={referral.id}
        contactName={referral.contactName}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}

export const partnerReferralColumns: ColumnDef<PartnerReferralListRow>[] = [
  {
    accessorKey: "contactName",
    header: sortable("Contact name"),
    cell: ({ row }) => (
      <span className="block max-w-[180px] truncate font-medium" title={row.original.contactName}>
        {row.original.contactName}
      </span>
    ),
  },
  {
    accessorKey: "contactCompany",
    header: sortable("Company"),
    cell: ({ row }) =>
      row.original.contactCompany ? (
        <span className="block max-w-[150px] truncate" title={row.original.contactCompany}>
          {row.original.contactCompany}
        </span>
      ) : (
        dash
      ),
  },
  {
    accessorKey: "status",
    header: sortable("Referral Status"),
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
    accessorKey: "createdAt",
    header: sortable("Date submitted"),
    cell: ({ row }) => <span className="text-muted-foreground">{fmtDate(row.original.createdAt)}</span>,
  },
  {
    accessorKey: "lastInvoiceAt",
    header: sortable("Last invoice"),
    cell: ({ row }) =>
      row.original.lastInvoiceAt ? (
        <span className="text-muted-foreground">{fmtDate(row.original.lastInvoiceAt)}</span>
      ) : (
        dash
      ),
  },
  {
    accessorKey: "totalCommission",
    header: sortable("Total commission"),
    cell: ({ row }) => (
      <div className="tabular-nums">
        {row.original.totalCommission ? (
          <span className="font-medium text-success">
            {formatCurrency(row.original.totalCommission)}
          </span>
        ) : (
          dash
        )}
      </div>
    ),
  },
  {
    id: "actions",
    header: th("", "right"),
    enableSorting: false,
    cell: ({ row }) => <ReferralRowActions referral={row.original} />,
  },
];
