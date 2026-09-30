import { z } from "zod";
import { optionalUsPhoneSchema } from "./phone";
import { emailSchema } from "./email";
import { personNameSchema } from "./name";

/**
 * An admin editing their OWN profile (admin portal → account menu → Profile).
 * Admins have their identity plus notification-channel preferences (mirroring the
 * partner profile). `email` is intentionally absent: it's the login identity and is
 * shown read-only. `phone` uses the strict US rule (`optionalUsPhoneSchema`) — a
 * valid 10-digit national number, masked to `(555) 555-5555` in the form — and
 * accepts an empty string; the action normalizes "" → null.
 * Both notification booleans are always sent (controlled checkboxes); the
 * "email on, SMS off" default lives in the DB column defaults + the form's initial
 * values.
 */
export const updateAdminProfileSchema = z.object({
  fullName: personNameSchema("Full name"),
  phone: optionalUsPhoneSchema,
  notifyByEmail: z.boolean(),
  notifyBySms: z.boolean(),
});

export type UpdateAdminProfileFormData = z.infer<typeof updateAdminProfileSchema>;

/**
 * Change-email flow (partner self-service). Step 1 requests a code for a NEW email;
 * step 2 confirms with the 6-digit code. Mirrors the partner login OTP schemas
 * (`partnerEmailSchema` / `partnerOtpSchema` in ./auth.ts) — because there's no email
 * OTP delivery yet, the code is validated for format only and the mock accepts any
 * 6 digits (see the change-email actions in src/app/actions/account.ts).
 */
export const requestEmailChangeSchema = z.object({
  email: emailSchema,
});

export const verifyEmailChangeSchema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export type RequestEmailChangeFormData = z.infer<typeof requestEmailChangeSchema>;
export type VerifyEmailChangeFormData = z.infer<typeof verifyEmailChangeSchema>;
