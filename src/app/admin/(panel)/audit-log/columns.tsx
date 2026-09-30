"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import {
  ArrowLeftRight,
  Banknote,
  Check,
  FileText,
  Folder,
  ImageIcon,
  LogIn,
  LogOut,
  Mail,
  Pencil,
  Plus,
  Receipt,
  Share2,
  Trash2,
  User,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import type { activity_action, activity_entity_type } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { SortableHeader } from "@/components/data-table";
import { cn } from "@/lib/utils";
import type { ActivityLogRow } from "@/lib/services/activity-service";

const fmtWhen = (iso: string) => format(parseISO(iso), "MMM d, yyyy · h:mm a");

/** Human labels for the action enum. */
const ACTION_LABEL: Record<activity_action, string> = {
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
  status_changed: "Status changed",
  approved: "Approved",
  rejected: "Rejected",
  invoice_paid: "Invoice paid",
  payout_recorded: "Payout recorded",
  logged_in: "Logged in",
  logged_out: "Logged out",
};

/**
 * Per-action tinted-pill palette for the Activity log. Each action gets a soft
 * warm fill + matching text (on-palette: no cold/blue hues). Hues group by
 * meaning — green/teal for create & money-positive, brick for destructive,
 * gold/amber for edits & state changes, calm sage/stone for sessions — while
 * each action keeps a distinct shade. Rendered via the `ghost` Badge variant
 * (no base fill) so these classes own the color.
 */
const ACTION_TONE: Record<activity_action, string> = {
  created: "bg-[#E2F1EC] text-[#00685B]",
  updated: "bg-[#F6F0E1] text-[#8A5A12]",
  status_changed: "bg-[#F6F2EA] text-[#946218]",
  approved: "bg-[#E0F2E9] text-[#00875A]",
  rejected: "bg-[#FBE7E2] text-[#BE3219]",
  deleted: "bg-[#F3E4E0] text-[#8E2614]",
  invoice_paid: "bg-[#DCF2E8] text-[#00795A]",
  payout_recorded: "bg-[#DFEEEB] text-[#00564C]",
  logged_in: "bg-[#E2F0F2] text-[#0E7490]",
  logged_out: "bg-[#F8E7D6] text-[#C2700E]",
};

/** Icon paired with each action — mirrors the tone semantics. */
const ACTION_ICON: Record<activity_action, LucideIcon> = {
  created: Plus,
  updated: Pencil,
  status_changed: ArrowLeftRight,
  approved: Check,
  rejected: X,
  deleted: Trash2,
  invoice_paid: Receipt,
  payout_recorded: Banknote,
  logged_in: LogIn,
  logged_out: LogOut,
};

const ENTITY_LABEL: Record<activity_entity_type, string> = {
  partner: "Partner",
  referral: "Referral",
  invoice: "Invoice",
  payout: "Payout",
  marketing_section: "Marketing section",
  marketing_item: "Marketing item",
  partner_invite: "Invite",
  user: "User",
};

/** Icon per entity type — shown inline with the label (plain text, no badge). */
const ENTITY_ICON: Record<activity_entity_type, LucideIcon> = {
  partner: Users,
  referral: Share2,
  invoice: FileText,
  payout: Banknote,
  marketing_section: Folder,
  marketing_item: ImageIcon,
  partner_invite: Mail,
  user: User,
};

/** True for `{ from, to }`-shaped diff entries. */
function isFromTo(v: unknown): v is { from: unknown; to: unknown } {
  return typeof v === "object" && v !== null && "from" in v && "to" in v;
}

function fmtVal(v: unknown): string {
  if (v === null || v === undefined || v === "") return "∅";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/** Compact render of the `changes` payload: one line per field, `from → to` when applicable. */
function ChangesCell({ changes }: { changes: unknown }) {
  if (changes == null || typeof changes !== "object") {
    return <span className="text-muted-foreground">—</span>;
  }
  const entries = Object.entries(changes as Record<string, unknown>);
  if (entries.length === 0) return <span className="text-muted-foreground">—</span>;

  return (
    <div className="max-w-[420px] whitespace-normal text-sm">
      {entries.map(([key, val]) => (
        <div key={key} className="flex flex-wrap items-baseline gap-1">
          <span className="font-medium text-foreground">{key}:</span>
          {isFromTo(val) ? (
            <span className="min-w-0 text-muted-foreground">
              <span className="line-through break-words">{fmtVal(val.from)}</span> →{" "}
              <span className="break-words">{fmtVal(val.to)}</span>
            </span>
          ) : (
            <span className="min-w-0 break-words text-muted-foreground">{fmtVal(val)}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export const auditLogColumns: ColumnDef<ActivityLogRow>[] = [
  {
    accessorKey: "createdAt",
    header: ({ column }) => <SortableHeader column={column}>When</SortableHeader>,
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-sm tabular-nums">{fmtWhen(row.original.createdAt)}</span>
    ),
  },
  {
    id: "actor",
    accessorFn: (r) => r.actorEmail ?? "System",
    header: ({ column }) => <SortableHeader column={column}>Actor</SortableHeader>,
    cell: ({ row }) => {
      const { actorEmail, actorName } = row.original;
      if (!actorEmail) return <span className="text-muted-foreground">System</span>;
      return (
        <div className="leading-tight">
          {actorName && (
            <div className="max-w-[240px] truncate font-medium" title={actorName}>
              {actorName}
            </div>
          )}
          <div
            className={cn("max-w-[240px] truncate text-sm", actorName && "text-muted-foreground")}
            title={actorEmail}
          >
            {actorEmail}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "action",
    header: ({ column }) => <SortableHeader column={column}>Action</SortableHeader>,
    cell: ({ row }) => {
      const Icon = ACTION_ICON[row.original.action];
      return (
        <Badge variant="ghost" className={ACTION_TONE[row.original.action]}>
          <Icon aria-hidden />
          {ACTION_LABEL[row.original.action]}
        </Badge>
      );
    },
  },
  {
    accessorKey: "entityType",
    header: ({ column }) => <SortableHeader column={column}>Entity</SortableHeader>,
    cell: ({ row }) => {
      const Icon = ENTITY_ICON[row.original.entityType];
      return (
        <div className="leading-tight">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0A0A0A]">
            <Icon className="size-3.5 shrink-0" aria-hidden />
            {ENTITY_LABEL[row.original.entityType]}
          </span>
          {row.original.entityName && (
            <div
              className="mt-0.5 max-w-[220px] truncate text-sm text-muted-foreground"
              title={row.original.entityName}
            >
              {row.original.entityName}
            </div>
          )}
        </div>
      );
    },
  },
  {
    id: "changes",
    header: "Changes",
    enableSorting: false,
    cell: ({ row }) => <ChangesCell changes={row.original.changes} />,
  },
];
