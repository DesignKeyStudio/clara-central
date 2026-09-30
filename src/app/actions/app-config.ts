"use server";

import { getSessionContext } from "@/lib/actions/auth-context";
import {
  type AppConfigValues,
  getAppConfig,
  updateAppConfig,
} from "@/lib/services/app-config-service";
import { appConfigSchema } from "@/lib/validations/app-config";

/** Admin-only: read the org's commission settings. */
export async function getAppConfigAction(): Promise<AppConfigValues> {
  const ctx = await getSessionContext();
  if (ctx.role !== "admin") throw new Error("Forbidden");
  return getAppConfig(ctx.organizationId);
}

export type UpdateAppConfigResult = { config: AppConfigValues } | { error: string };

/** Admin-only: update the platform commission settings. */
export async function updateAppConfigAction(input: unknown): Promise<UpdateAppConfigResult> {
  const ctx = await getSessionContext();
  if (ctx.role !== "admin") throw new Error("Forbidden");

  const parsed = appConfigSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid settings" };
  }

  // Note: AppConfig changes are intentionally NOT logged to ActivityLog (per the
  // app-config spec). Settings changes are rare/admin-only.
  const config = await updateAppConfig(ctx.organizationId, {
    standardCommissionRate: parsed.data.standardCommissionRate,
    commissionValidMonths: parsed.data.commissionValidMonths,
    payoutCadenceNote: parsed.data.payoutCadenceNote?.trim() ? parsed.data.payoutCadenceNote.trim() : null,
  });

  return { config };
}
