/**
 * SMS channel — transport seam + message copy.
 *
 * There is no Twilio account yet, so {@link sendSms} is a STUB: it logs the
 * message to the server console. The transport is env-guarded so wiring the real
 * provider later is a config change plus one adapter, with NO call-site changes —
 * see the `// TODO(twilio)` boundary below.
 *
 * Like the email transport, this is best-effort: it never throws, so an SMS
 * failure can never break the surrounding mutation.
 */

/** True once Twilio (or any provider) is configured via env. Always false today. */
function smsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER,
  );
}

/**
 * Send an SMS to `to` (E.164 phone), or log it when no provider is configured.
 * Returns `true` when accepted/logged, `false` on failure. Never throws.
 */
export async function sendSms(to: string, message: string, label = "sms"): Promise<boolean> {
  if (!smsConfigured()) {
    // Stub: no provider wired. Log the exact message so QA can verify content.
    console.log(`[sms:stub] ${label} → ${to}: ${message}`);
    return true;
  }

  // TODO(twilio): construct the Twilio client from the env vars above and send.
  // Kept as a single seam so enabling real SMS never touches the dispatcher or
  // any call site. Until the SDK is added, treat "configured" as unsupported.
  console.warn(`[sms] ${label}: provider configured but adapter not implemented`);
  return false;
}

// ── Message copy (concise, < ~160 chars, one short link) ──

// Same seam as the email templates — set NEXT_PUBLIC_BRAND_NAME per deployment.
const brand = process.env.NEXT_PUBLIC_BRAND_NAME ?? "Clara Central";

export const smsCopy = {
  newLead: (contactName: string, url: string) =>
    `${brand}: New lead "${contactName}" via your referral link. ${url}`,
  referralStatus: (contactName: string, statusLabel: string, url: string) =>
    `${brand}: Your referral ${contactName} is now ${statusLabel}. ${url}`,
  invoiceIssued: (invoiceNumber: string, amount: string, contactName: string, url: string) =>
    `${brand}: New invoice ${invoiceNumber} (${amount}) on referral ${contactName}. ${url}`,
  payoutRecorded: (amount: string, url: string) =>
    `${brand}: A commission payout of ${amount} was recorded to your account. ${url}`,
  adminNewSignup: (applicantName: string, url: string) =>
    `${brand}: New partner application from ${applicantName}. ${url}`,
  adminOnboarded: (partnerName: string, url: string) =>
    `${brand}: ${partnerName} accepted their invite and onboarded. ${url}`,
  adminNewReferral: (partnerName: string, contactName: string, url: string) =>
    `${brand}: New referral "${contactName}" from ${partnerName}. ${url}`,
} as const;
