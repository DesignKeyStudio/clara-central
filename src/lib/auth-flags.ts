/**
 * Whether email-based one-time codes verify a REAL emailed OTP (TKT-001). Off by
 * default: until Supabase SMTP + a sending domain are configured, the partner
 * login OTP and the partner change-email flow accept any 6-digit code and complete
 * the operation server-side (no email sent) — the deployed variant has no email
 * domain yet. Set `NEXT_PUBLIC_PARTNER_OTP_EMAIL="true"` once real delivery works
 * to require the genuine emailed code.
 *
 * Lives in a plain module (not a `"use server"` file) so it can be imported by both
 * the auth actions and the account actions — server-action modules may only export
 * async functions.
 */
export function partnerOtpEmailEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PARTNER_OTP_EMAIL === "true";
}
