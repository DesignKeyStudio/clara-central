import { z } from "zod";
import { commissionRateSchema } from "./commission";

/**
 * Admin "Settings" form — the platform-wide commission knobs. `standardCommissionRate`
 * is the default applied to new partners/invites; `commissionValidMonths` is how long
 * a referral keeps earning from its submission date.
 */
export const appConfigSchema = z.object({
  standardCommissionRate: commissionRateSchema,
  commissionValidMonths: z.coerce
    .number({ invalid_type_error: "Enter a number" })
    .int("Enter a whole number of months")
    .min(1, "Must be at least 1 month")
    .max(120, "Must be 120 months or fewer"),
  /** Optional free-text note shown to partners on the Payouts page (e.g. cadence). */
  payoutCadenceNote: z.string().trim().max(500, "Keep the note under 500 characters").optional(),
});

export type AppConfigFormData = z.infer<typeof appConfigSchema>;
