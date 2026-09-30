import { z } from "zod";

/**
 * Shared money primitive for invoice / payout / payment amounts (USD). The bounds
 * catch fat-finger errors: below $0.01 there's nothing to record, and the ceiling
 * stays well under the `Decimal(12,2)` column's overflow. `z.coerce` accepts the
 * string an `<input type="number">` submits.
 */
export const MIN_AMOUNT = 0.01;
export const MAX_AMOUNT = 100_000_000;

export const amountSchema = z.coerce
  .number({ invalid_type_error: "Enter an amount" })
  .min(MIN_AMOUNT, "Enter an amount greater than 0")
  .max(MAX_AMOUNT, "Amount can't exceed $100,000,000");
