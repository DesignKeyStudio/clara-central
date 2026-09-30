import { z } from "zod";
import { optionalUrlSchema } from "./url";
import { optionalUsPhoneSchema } from "./phone";
import { emailSchema } from "./email";
import { commissionRateSchema } from "./commission";
import { MAX_NAME_LENGTH, personNameSchema } from "./name";

/**
 * Admin "Edit partner" form. Optional text fields accept empty strings (the
 * action normalizes "" → null before persisting). `commissionRate` is the single
 * per-partner rate applied to all their referrals.
 */
export const updatePartnerSchema = z.object({
  fullName: personNameSchema("Full name"),
  email: emailSchema,
  phone: optionalUsPhoneSchema,
  companyName: z.string().trim().optional(),
  role: z.string().trim().optional(),
  location: z.string().trim().optional(),
  website: optionalUrlSchema,
  commissionRate: commissionRateSchema,
});

export type UpdatePartnerFormData = z.infer<typeof updatePartnerSchema>;

/**
 * A partner editing their OWN profile (partner portal → account menu → Profile).
 * Same editable contact fields as the admin form, minus `email` (read-only — it's
 * the login identity) and `commissionRate` (partners can't set their own rate),
 * plus the two notification-channel preferences. The form always sends both
 * booleans (controlled checkboxes); the "email on, SMS off" default lives in the DB
 * column defaults + the form's initial values. Optional text fields accept empty
 * strings; the action normalizes "" → null before persisting.
 */
export const updatePartnerProfileSchema = z.object({
  fullName: personNameSchema("Full name"),
  phone: optionalUsPhoneSchema,
  companyName: z.string().trim().optional(),
  role: z.string().trim().optional(),
  location: z.string().trim().optional(),
  website: optionalUrlSchema,
  notifyByEmail: z.boolean(),
  notifyBySms: z.boolean(),
});

export type UpdatePartnerProfileFormData = z.infer<typeof updatePartnerProfileSchema>;

/**
 * Step 1 of the avatar signed-upload flow — request an upload URL for an intended
 * profile picture. Type/size are enforced server-side via `validateCoverImage`
 * (raster image, ≤5 MB — the same constraints as marketing cover art).
 */
export const prepareAvatarUploadSchema = z.object({
  fileName: z.string().min(1),
  size: z.number().int().nonnegative(),
});

/**
 * Admin "Invite a partner" dialog. Full name + email are required; the rest are
 * onboarding prefill the partner can edit. `commissionRate` is stored on the
 * invite and copied onto the Partner at acceptance (defaults to the standard 10%).
 */
export const invitePartnerSchema = z.object({
  // Optional per spec — an email-only invite is allowed.
  fullName: z.string().trim().max(MAX_NAME_LENGTH, "Keep the name under 250 characters").optional(),
  email: emailSchema,
  companyName: z.string().trim().optional(),
  location: z.string().trim().optional(),
  website: optionalUrlSchema,
  commissionRate: commissionRateSchema,
});

export type InvitePartnerFormData = z.infer<typeof invitePartnerSchema>;

/**
 * Invited-partner onboarding form (the public `/invite/[token]` page). Email,
 * commission rate, and "how did you hear" are NOT here — email is locked to the
 * invite, the rate is admin-set, and "how did you hear" is fixed to "Invited by
 * Clara Central". Both agreement checkboxes must be ticked.
 */
export const completeOnboardingSchema = z.object({
  fullName: personNameSchema("Full name"),
  phone: optionalUsPhoneSchema,
  companyName: z.string().trim().optional(),
  role: z.string().trim().optional(),
  location: z.string().trim().optional(),
  website: optionalUrlSchema,
  typesOfReferrals: z.string().trim().optional(),
  agreeTerms: z
    .boolean()
    .refine((v) => v === true, "You must accept the terms & conditions"),
  agreePrivacy: z
    .boolean()
    .refine((v) => v === true, "You must consent to the privacy policy"),
});

export type CompleteOnboardingFormData = z.infer<typeof completeOnboardingSchema>;

/**
 * Public self-registration ("Apply to join"). Same shape as the invited
 * onboarding plus the two fields an applicant fills themselves: their `email`
 * (editable, unlike the invite where it's locked) and a free-text `howDidYouHear`.
 * Drives the shared onboarding form in "apply" mode and `applyToJoinAction`.
 */
export const applyToJoinSchema = completeOnboardingSchema.extend({
  email: emailSchema,
  howDidYouHear: z.string().trim().optional(),
});

export type ApplyToJoinFormData = z.infer<typeof applyToJoinSchema>;
