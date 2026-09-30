import { z } from "zod";

/**
 * Shared commission-rate primitive (a percentage). Used by the admin edit-partner
 * and invite-partner forms and the platform-wide default in Settings, so all three
 * enforce the same 0.01–100% range with identical wording. Stored as `Decimal(5,2)`.
 */
export const commissionRateSchema = z.coerce
  .number({ invalid_type_error: "Enter a number" })
  .min(0.01, "Commission rate must be between 0.01% and 100%.")
  .max(100, "Commission rate must be between 0.01% and 100%.");
