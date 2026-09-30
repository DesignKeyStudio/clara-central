import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/actions/mappers";

// ── View-models ──
// Per-organization platform settings (one row per org, keyed by organizationId):
// the system-wide standard commission rate (default for new partners/invites) and
// the commission validity window in months (how long a referral keeps earning).
// Both are admin-editable via `/admin/settings`; reads fall back to the schema
// defaults if the row is missing.

export type AppConfigValues = {
  /** System-wide standard commission rate (%) applied to new partners/invites. */
  standardCommissionRate: number;
  /** How many months a referral earns commission from its submission date. */
  commissionValidMonths: number;
  /** Free-text note shown to partners on the Payouts page (e.g. payout cadence); null when unset. */
  payoutCadenceNote: string | null;
};

/** Schema defaults — used when the org's config row hasn't been seeded yet. */
const DEFAULTS: AppConfigValues = {
  standardCommissionRate: 10,
  commissionValidMonths: 12,
  payoutCadenceNote: null,
};

// ── Queries ──

/** Read the org's config, or the schema defaults when the row is absent. */
export async function getAppConfig(organizationId: string): Promise<AppConfigValues> {
  const cfg = await prisma.appConfig.findUnique({ where: { organizationId } });
  if (!cfg) return DEFAULTS;
  return {
    standardCommissionRate: toNumber(cfg.standardCommissionRate),
    commissionValidMonths: cfg.commissionValidMonths,
    payoutCadenceNote: cfg.payoutCadenceNote,
  };
}

// ── Mutations ──

/** Upsert the org's config (creates it if it doesn't exist yet). */
export async function updateAppConfig(
  organizationId: string,
  values: AppConfigValues,
): Promise<AppConfigValues> {
  const cfg = await prisma.appConfig.upsert({
    where: { organizationId },
    update: {
      standardCommissionRate: values.standardCommissionRate,
      commissionValidMonths: values.commissionValidMonths,
      payoutCadenceNote: values.payoutCadenceNote,
    },
    create: {
      organizationId,
      standardCommissionRate: values.standardCommissionRate,
      commissionValidMonths: values.commissionValidMonths,
      payoutCadenceNote: values.payoutCadenceNote,
    },
  });
  return {
    standardCommissionRate: toNumber(cfg.standardCommissionRate),
    commissionValidMonths: cfg.commissionValidMonths,
    payoutCadenceNote: cfg.payoutCadenceNote,
  };
}
