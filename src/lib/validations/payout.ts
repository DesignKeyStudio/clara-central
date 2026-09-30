import { z } from "zod";
import { amountSchema } from "./amount";

/**
 * Admin "Record payout" / "Record payment" form. One schema serves the partner-level,
 * referral-level, and edit flows. There is no owed cap (per the commission-engine
 * spec) — over-paying (up to the shared amount ceiling) is allowed and the dialog
 * shows a non-blocking warning.
 */
export const recordPayoutSchema = z.object({
  amount: amountSchema,
  publicNote: z.string().trim().optional(),
  privateNote: z.string().trim().optional(),
});

export type RecordPayoutFormData = z.infer<typeof recordPayoutSchema>;
