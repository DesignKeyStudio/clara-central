import { getResend, resolveFrom } from "./client";
import type { EmailContent } from "./templates";

/**
 * Low-level transactional email transport. The single seam between the app and
 * Resend — the notification dispatcher (`src/lib/notifications/`) builds the
 * `EmailContent` from a template and hands it here.
 *
 * Best-effort by contract: returns `true` only when Resend accepted the message,
 * and `false` when email is disabled (prototype mode / no `RESEND_API_KEY`) or the
 * send failed. Never throws — callers must never let an email failure break the
 * surrounding mutation (the DB row is the source of truth).
 *
 * Note: with the default `onboarding@resend.dev` sender, Resend only *delivers* to
 * the Resend account owner's address. A `true` result means "accepted by Resend",
 * which is only "landed in the inbox" once you verify your own sending domain in
 * Resend and point `EMAIL_FROM` at it.
 */
export async function sendEmail(
  to: string,
  content: EmailContent,
  label = "email",
): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;
  try {
    const { error } = await resend.emails.send({
      from: resolveFrom(),
      to,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });
    if (error) {
      console.warn(`[email] ${label} send failed:`, error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[email] ${label} send threw:`, err);
    return false;
  }
}
