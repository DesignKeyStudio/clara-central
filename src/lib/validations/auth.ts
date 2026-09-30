import { z } from "zod";
import { emailSchema } from "./email";

/** Admin password sign-in. */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

/** Admin password reset request. */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

/** Admin set-new-password. */
export const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

/** Partner OTP — step 1: request a code for an email. */
export const partnerEmailSchema = z.object({
  email: emailSchema,
});

/** Partner OTP — step 2: verify the 6-digit code. */
export const partnerOtpSchema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type PartnerEmailFormData = z.infer<typeof partnerEmailSchema>;
export type PartnerOtpFormData = z.infer<typeof partnerOtpSchema>;
