"use server";

import { getSessionContext } from "@/lib/actions/auth-context";
import { getDashboardData, type DashboardData } from "@/lib/services/dashboard-service";

/** Admin-only: aggregated platform metrics for the `/admin` overview dashboard. */
export async function getDashboardAction(): Promise<DashboardData> {
  const ctx = await getSessionContext();
  if (ctx.role !== "admin") throw new Error("Forbidden");
  return getDashboardData(ctx.organizationId);
}
