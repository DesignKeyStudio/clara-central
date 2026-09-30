import { Prisma, type activity_action, type activity_entity_type } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** One field's before/after pair in a `changes` diff. */
export type ChangeEntry = { from: unknown; to: unknown };

export type LogActivityInput = {
  organizationId: string;
  userId?: string | null;
  action: activity_action;
  entityType: activity_entity_type;
  /** TypeID (domain) or uuid (user). */
  entityId: string;
  entityName?: string | null;
  /**
   * Structured audit payload (audit-log spec). Shapes by event kind:
   * - `updated` / `status_changed` → `{ field: { from, to } }` (changed keys only)
   * - `created` → an initial field snapshot
   * - `deleted` → `{ deletedRecord: <snapshot> }`
   * Omit (or pass `null`) for events the spec doesn't require a diff for (auth).
   * Arbitrary JSON — cast to Prisma's JSON input at the write boundary below.
   */
  changes?: unknown;
};

/**
 * Append a row to the audit trail. Single-tenant — no org scoping.
 * Best-effort: callers typically `.catch(() => {})` so logging never blocks
 * the primary operation.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  await prisma.activityLog.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      entityName: input.entityName ?? null,
      changes:
        input.changes == null ? Prisma.DbNull : (input.changes as Prisma.InputJsonValue),
    },
  });
}

/**
 * Coerce a value to a stable, JSON-safe form so comparisons are reliable and the
 * stored diff stays clean: `Date` → ISO string, `Prisma.Decimal` (and anything
 * with `.toNumber()`) → number, `undefined` → `null`.
 */
function normalize(v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString();
  if (
    typeof v === "object" &&
    v !== null &&
    "toNumber" in v &&
    typeof (v as { toNumber: unknown }).toNumber === "function"
  ) {
    return (v as { toNumber: () => number }).toNumber();
  }
  return v;
}

/**
 * Build a `{ field: { from, to } }` diff of two records, keeping only keys whose
 * value actually changed. Returns `null` when nothing changed (so callers can skip
 * an empty `changes` payload). `keys` restricts the comparison; when omitted, the
 * union of both objects' keys is used. Values are normalized (dates → ISO,
 * decimals → number) before comparison.
 */
export function diffChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  keys?: string[],
): Record<string, ChangeEntry> | null {
  const cmpKeys = keys ?? Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  const diff: Record<string, ChangeEntry> = {};
  for (const k of cmpKeys) {
    const from = normalize(before[k]);
    const to = normalize(after[k]);
    if (!Object.is(from, to)) {
      diff[k] = { from, to };
    }
  }
  return Object.keys(diff).length > 0 ? diff : null;
}

/** Normalize a record's values for storage as a `created` snapshot or `deletedRecord`. */
export function snapshot(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) out[k] = normalize(v);
  return out;
}

// ── Read (admin audit-log viewer) ──

/** One row of the admin audit-log table — an activity event with its actor resolved. */
export type ActivityLogRow = {
  id: string;
  /** When the event was recorded (ISO timestamp). */
  createdAt: string;
  /** Acting user's email, or null for system / unauthenticated events (e.g. self-signup). */
  actorEmail: string | null;
  actorName: string | null;
  action: activity_action;
  entityType: activity_entity_type;
  entityName: string | null;
  entityId: string;
  /** Structured diff/snapshot payload, or null. */
  changes: unknown;
};

export type ActivityLogFilters = {
  action?: activity_action;
  entityType?: activity_entity_type;
  userId?: string;
};

/**
 * Newest-first slice of the audit trail for the admin viewer. Append-only table —
 * this is the only read. Capped at 500 rows (no UI need for deep history yet);
 * optional filters narrow by action / entity type / actor.
 */
export async function listActivity(
  organizationId: string,
  filters?: ActivityLogFilters,
): Promise<ActivityLogRow[]> {
  const rows = await prisma.activityLog.findMany({
    where: {
      organizationId,
      ...(filters?.action ? { action: filters.action } : {}),
      ...(filters?.entityType ? { entityType: filters.entityType } : {}),
      ...(filters?.userId ? { userId: filters.userId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { user: { select: { email: true, fullName: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    actorEmail: r.user?.email ?? null,
    actorName: r.user?.fullName ?? null,
    action: r.action,
    entityType: r.entityType,
    entityName: r.entityName,
    entityId: r.entityId,
    changes: r.changes ?? null,
  }));
}
