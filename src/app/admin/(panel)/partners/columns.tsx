"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Column, ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "@/components/custom/status-badge";
import { UserAvatar } from "@/components/custom/user-avatar";
import { SortableHeader } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import type { PartnerListRow } from "@/lib/services/partner-service";
import { partnerStatusMeta } from "@/lib/status-meta";
import { cn, formatCurrency, getInitials } from "@/lib/utils";
import { PartnerStatusDialog } from "./partner-status-dialog";

function Money({ amount }: { amount: number }) {
  // Absent value = em dash in subtle gray (never $0.00); paid/positive emphasized in success green.
  if (!amount) return <span className="tabular-nums text-[#9E9D9D]">—</span>;
  return <span className="font-medium tabular-nums text-success">{formatCurrency(amount)}</span>;
}

/**
 * Row actions: pending partners get Approve/Decline (each gated behind a confirm
 * dialog); everyone else gets View. Stops row-click propagation so the buttons
 * don't also navigate.
 */
function PartnerRowActions({ partner }: { partner: PartnerListRow }) {
  const router = useRouter();
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);

  if (partner.status === "pending") {
    return (
      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
        <Button size="sm" variant="success" onClick={() => setPending("approve")}>
          Approve
        </Button>
        <Button size="sm" variant="destructive" onClick={() => setPending("reject")}>
          Decline
        </Button>
        <PartnerStatusDialog
          partnerId={partner.id}
          partnerName={partner.fullName}
          mode={pending ?? "approve"}
          open={pending !== null}
          onOpenChange={(o) => !o && setPending(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
      <Button
        size="sm"
        variant="ghost"
        className="bg-[#F7F5F3] text-[#94722D] hover:bg-[#EFEDE9] hover:text-[#94722D]"
        onClick={() => router.push(`/admin/partners/${partner.id}`)}
      >
        View
      </Button>
    </div>
  );
}

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
function sortable(label: string, align: "left" | "center" | "right" = "left") {
  return function SortHeader({ column }: { column: Column<PartnerListRow, unknown> }) {
    return (
      <SortableHeader column={column} align={align}>
        {label}
      </SortableHeader>
    );
  };
}

// Column definitions shared by the main list and the pending-applications section.
const nameColumn: ColumnDef<PartnerListRow> = {
  accessorKey: "fullName",
  header: sortable("Name"),
  cell: ({ row }) => (
    <div className="flex min-w-0 items-center gap-3">
      <UserAvatar
        initials={getInitials(row.original.fullName)}
        size="sm"
        tint={row.index % 2 === 0 ? "gold" : "teal"}
        imageUrl={row.original.avatarUrl}
      />
      <Link
        href={`/admin/partners/${row.original.id}`}
        className="block max-w-[180px] truncate font-medium hover:underline"
        title={row.original.fullName}
        onClick={(e) => e.stopPropagation()}
      >
        {row.original.fullName}
      </Link>
    </div>
  ),
};

const companyColumn: ColumnDef<PartnerListRow> = {
  accessorKey: "companyName",
  header: sortable("Company"),
  cell: ({ row }) => (
    <span className="block max-w-[160px] truncate" title={row.original.companyName ?? undefined}>
      {row.original.companyName}
    </span>
  ),
};

const actionsColumn: ColumnDef<PartnerListRow> = {
  id: "actions",
  header: th("Actions", "right"),
  enableSorting: false,
  cell: ({ row }) => <PartnerRowActions partner={row.original} />,
};

export const partnerColumns: ColumnDef<PartnerListRow>[] = [
  nameColumn,
  companyColumn,
  {
    accessorKey: "status",
    header: sortable("Status"),
    cell: ({ row }) => <StatusBadge {...partnerStatusMeta(row.original.status)} />,
  },
  {
    accessorKey: "rate",
    header: sortable("Rate"),
    cell: ({ row }) => <span className="tabular-nums">{row.original.rate}%</span>,
  },
  {
    accessorKey: "referralCount",
    header: sortable("Referrals"),
    cell: ({ row }) => <div className="tabular-nums">{row.original.referralCount}</div>,
  },
  {
    accessorKey: "commissionPaid",
    header: sortable("Comm. Paid"),
    cell: ({ row }) => (
      <div>
        <Money amount={row.original.commissionPaid} />
      </div>
    ),
  },
  {
    accessorKey: "commissionOwed",
    header: sortable("Comm. Owed"),
    cell: ({ row }) => (
      <div>
        <Money amount={row.original.commissionOwed} />
      </div>
    ),
  },
  actionsColumn,
];
