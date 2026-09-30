"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { activity_action, activity_entity_type } from "@prisma/client";
import { PageHeader } from "@/components/custom/page-header";
import { DataTable } from "@/components/data-table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActivityLog } from "@/lib/queries/hooks";
import { auditLogColumns } from "./columns";

const ACTIONS: activity_action[] = [
  "created",
  "updated",
  "deleted",
  "status_changed",
  "approved",
  "rejected",
  "invoice_paid",
  "payout_recorded",
  "logged_in",
  "logged_out",
];

const ENTITY_TYPES: activity_entity_type[] = [
  "partner",
  "referral",
  "invoice",
  "payout",
  "marketing_section",
  "marketing_item",
  "partner_invite",
  "user",
];

const labelize = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function AuditLogClient() {
  const { data: events = [], isLoading } = useActivityLog();
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<string>("all");
  const [entityType, setEntityType] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      if (action !== "all" && e.action !== action) return false;
      if (entityType !== "all" && e.entityType !== entityType) return false;
      if (!q) return true;
      return (
        (e.entityName?.toLowerCase().includes(q) ?? false) ||
        (e.actorEmail?.toLowerCase().includes(q) ?? false) ||
        (e.actorName?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [events, search, action, entityType]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity log"
        subtitle="A complete, append-only record of every change across the platform."
      />

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by entity or actor…"
            className="pl-9"
            aria-label="Search activity"
          />
        </div>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-[170px]" aria-label="Filter by action">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {ACTIONS.map((a) => (
              <SelectItem key={a} value={a}>
                {labelize(a)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={entityType} onValueChange={setEntityType}>
          <SelectTrigger className="w-[180px]" aria-label="Filter by entity type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entities</SelectItem>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {labelize(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={auditLogColumns}
        data={filtered}
        isLoading={isLoading}
        pageSize={25}
        emptyMessage="No activity matches your filters."
      />
    </div>
  );
}
