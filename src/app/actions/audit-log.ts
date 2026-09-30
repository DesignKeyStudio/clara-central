"use server";

import { getSessionContext } from "@/lib/actions/auth-context";
import {
  type ActivityLogFilters,
  type ActivityLogRow,
  listActivity,
} from "@/lib/services/activity-service";

/** Admin-only: the newest activity-log events for the audit-log viewer. */
export async function getActivityLogAction(
  filters?: ActivityLogFilters,
): Promise<ActivityLogRow[]> {
  const ctx = await getSessionContext();
  if (ctx.role !== "admin") throw new Error("Forbidden");
  return listActivity(ctx.organizationId, filters);
}
