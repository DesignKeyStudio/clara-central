/**
 * Transactional email templates — pure functions returning `{ subject, html, text }`.
 *
 * HTML is inline-styled and table-based for broad mail-client support. Colors are
 * email-safe hex (mail clients don't support the `oklch()` values in `brand.ts`),
 * chosen to match the app's green brand — and worth keeping visually aligned with
 * the Supabase Auth OTP / change-email templates, which are configured in the
 * Supabase dashboard (Auth → Email Templates), not in this repo.
 * User-supplied values (e.g. `fullName`) are HTML-escaped; links are app-generated.
 */

import { formatCurrency } from "@/lib/utils";

export type EmailContent = { subject: string; html: string; text: string };

const COLORS = {
  brand: "#00342E", // deep green — header band + emphasis
  action: "#00685B", // action green — CTA buttons + links
  text: "#2A2A2A",
  muted: "#71717A",
  border: "#EFEDE9",
  frame: "#F1EEE8", // warm outer canvas
  card: "#FFFFFF",
  headerText: "#FFFDF9", // cream wordmark on the green band
  headerSub: "#8FB6AD", // muted teal eyebrow on the green band
  tint: "#F7F5F3", // subtle inset surface (e.g. note block)
} as const;

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/**
 * Branding shown in the email header band and footer. Set these per deployment —
 * forks must not send mail branded as, or linking to, someone else's site.
 *
 * The footer link is derived from `NEXT_PUBLIC_SITE_URL`; when that's unset the
 * footer degrades to the copyright line alone rather than emitting a dead link.
 */
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? "Clara Central";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") ?? "";

/** `example.com` from `https://example.com/` — the display text for the footer link. */
function siteHost(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

function footerHtml(): string {
  const copyright = `&copy; ${escapeHtml(BRAND_NAME)}`;
  if (!SITE_URL) return copyright;
  return `${copyright} &middot; <a href="${escapeHtml(SITE_URL)}" style="color:${COLORS.action};text-decoration:none;">${escapeHtml(siteHost(SITE_URL))}</a>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function greeting(fullName: string): string {
  const name = fullName.trim();
  return name ? `Hi ${escapeHtml(name)},` : "Hi,";
}

function button(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:${COLORS.action};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:8px;">${label}</a>`;
}

/** Fallback "or paste this link" block shown under every CTA button. */
function linkFallback(url: string): string {
  return `<p style="margin:0 0 8px;color:${COLORS.muted};font-size:13px;">Or paste this link into your browser:</p>
        <p style="margin:0;font-size:13px;word-break:break-all;"><a href="${url}" style="color:${COLORS.action};">${url}</a></p>`;
}

/**
 * Wraps body HTML in the branded card + outer layout: a deep-green header band
 * with the wordmark + eyebrow, a white content card, and a muted footer. `eyebrow`
 * is the small uppercase label above the wordmark ("Referral program" by default,
 * "Admin" for admin-facing alerts).
 */
function shell(title: string, bodyHtml: string, eyebrow = "Referral program"): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.frame};">
  <div style="display:none;max-height:0;overflow:hidden;">${title}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.frame};padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:${COLORS.card};border:1px solid ${COLORS.border};border-radius:16px;overflow:hidden;font-family:${FONT};">
        <tr><td style="background:${COLORS.brand};padding:24px 32px;">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;color:${COLORS.headerText};letter-spacing:0.3px;">${escapeHtml(BRAND_NAME).replace(/ /g, "&nbsp;")}</div>
          <div style="font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:${COLORS.headerSub};margin-top:4px;">${eyebrow}</div>
        </td></tr>
        <tr><td style="padding:28px 32px 32px;color:${COLORS.text};font-size:15px;line-height:1.6;">
          ${bodyHtml}
        </td></tr>
      </table>
      <p style="max-width:480px;margin:16px auto 0;color:${COLORS.muted};font-size:12px;font-family:${FONT};text-align:center;">${footerHtml()}</p>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Invitation to join the referral program (links to token onboarding). */
export function invitePartnerTemplate(args: { fullName: string; link: string }): EmailContent {
  const subject = `You're invited to the ${BRAND_NAME} referral program`;
  const html = shell(
    subject,
    `<p style="margin:0 0 16px;">${greeting(args.fullName)}</p>
        <p style="margin:0 0 16px;">You've been invited to join the <strong>${BRAND_NAME}</strong> referral program — refer new business and earn a share of the payments your referrals generate.</p>
        <p style="margin:0 0 24px;">Set up your partner account below. It only takes a minute.</p>
        <p style="margin:0 0 24px;">${button("Accept invitation", args.link)}</p>
        ${linkFallback(args.link)}`,
  );
  const text = `${args.fullName.trim() ? `Hi ${args.fullName.trim()},` : "Hi,"}

You've been invited to join the ${BRAND_NAME} referral program. Set up your partner account here:

${args.link}

— ${BRAND_NAME}`;
  return { subject, html, text };
}

/** Self-signup applicant approved — they can now sign in. */
export function partnerApprovedTemplate(args: { fullName: string; loginUrl: string }): EmailContent {
  const subject = `Your ${BRAND_NAME} partner account is approved`;
  const html = shell(
    subject,
    `<p style="margin:0 0 16px;">${greeting(args.fullName)}</p>
        <p style="margin:0 0 16px;">Good news — your application to the <strong>${BRAND_NAME}</strong> referral program has been approved. You can now sign in and start referring contacts.</p>
        <p style="margin:0 0 24px;">${button("Sign in to your portal", args.loginUrl)}</p>
        ${linkFallback(args.loginUrl)}`,
  );
  const text = `${args.fullName.trim() ? `Hi ${args.fullName.trim()},` : "Hi,"}

Your application to the ${BRAND_NAME} referral program has been approved. Sign in here:

${args.loginUrl}

— ${BRAND_NAME}`;
  return { subject, html, text };
}

/** A commission payout was recorded to the partner's account. */
export function payoutRecordedTemplate(args: {
  fullName: string;
  amount: number;
  /** Note from the agency, shown to the partner (null when none). */
  note: string | null;
  earningsUrl: string;
}): EmailContent {
  const amount = formatCurrency(args.amount);
  const subject = `You've received a commission payout of ${amount}`;
  const noteBlockHtml = args.note
    ? `<p style="margin:0 0 24px;padding:12px 16px;background:${COLORS.tint};border-radius:8px;font-size:14px;"><strong>Note from the team:</strong> ${escapeHtml(args.note)}</p>`
    : "";
  const html = shell(
    subject,
    `<p style="margin:0 0 16px;">${greeting(args.fullName)}</p>
        <p style="margin:0 0 16px;">A commission payout of <strong>${amount}</strong> has been recorded to your <strong>${BRAND_NAME}</strong> account.</p>
        ${noteBlockHtml}
        <p style="margin:0 0 24px;">${button("View your earnings", args.earningsUrl)}</p>
        ${linkFallback(args.earningsUrl)}`,
  );
  const text = `${args.fullName.trim() ? `Hi ${args.fullName.trim()},` : "Hi,"}

A commission payout of ${amount} has been recorded to your ${BRAND_NAME} account.${
    args.note ? `\n\nNote from the team: ${args.note}` : ""
  }

View your earnings:

${args.earningsUrl}

— ${BRAND_NAME}`;
  return { subject, html, text };
}

/** A referral reached a notable pipeline status (closed / lost / not qualified). */
export function referralStatusChangedTemplate(args: {
  fullName: string;
  contactName: string;
  /** Human-facing status label, e.g. "Deal Closed". */
  statusLabel: string;
  referralUrl: string;
}): EmailContent {
  const contact = escapeHtml(args.contactName);
  const subject = `Referral update: ${args.contactName} — ${args.statusLabel}`;
  const html = shell(
    subject,
    `<p style="margin:0 0 16px;">${greeting(args.fullName)}</p>
        <p style="margin:0 0 16px;">Your referral <strong>${contact}</strong> is now <strong>${escapeHtml(args.statusLabel)}</strong>.</p>
        <p style="margin:0 0 24px;">${button("View referral", args.referralUrl)}</p>
        ${linkFallback(args.referralUrl)}`,
  );
  const text = `${args.fullName.trim() ? `Hi ${args.fullName.trim()},` : "Hi,"}

Your referral ${args.contactName} is now ${args.statusLabel}.

View referral:

${args.referralUrl}

— ${BRAND_NAME}`;
  return { subject, html, text };
}

/** A new client invoice was raised against the partner's referral. */
export function invoiceIssuedTemplate(args: {
  fullName: string;
  contactName: string;
  /** Human-facing invoice number, e.g. "INV-2061". */
  invoiceNumber: string;
  amount: number;
  referralUrl: string;
}): EmailContent {
  const amount = formatCurrency(args.amount);
  const contact = escapeHtml(args.contactName);
  const number = escapeHtml(args.invoiceNumber);
  const subject = `New invoice on your referral ${args.contactName}`;
  const html = shell(
    subject,
    `<p style="margin:0 0 16px;">${greeting(args.fullName)}</p>
        <p style="margin:0 0 16px;">A new invoice (<strong>${number}</strong>, <strong>${amount}</strong>) was added to your referral <strong>${contact}</strong>. Once it's paid, you'll earn commission on it.</p>
        <p style="margin:0 0 24px;">${button("View referral", args.referralUrl)}</p>
        ${linkFallback(args.referralUrl)}`,
  );
  const text = `${args.fullName.trim() ? `Hi ${args.fullName.trim()},` : "Hi,"}

A new invoice (${args.invoiceNumber}, ${amount}) was added to your referral ${args.contactName}. Once it's paid, you'll earn commission on it.

View referral:

${args.referralUrl}

— ${BRAND_NAME}`;
  return { subject, html, text };
}

/** A new lead came in through the partner's shareable referral link. */
export function newLeadTemplate(args: {
  fullName: string;
  contactName: string;
  referralUrl: string;
}): EmailContent {
  const contact = escapeHtml(args.contactName);
  const subject = `New lead from your referral link: ${args.contactName}`;
  const html = shell(
    subject,
    `<p style="margin:0 0 16px;">${greeting(args.fullName)}</p>
        <p style="margin:0 0 16px;"><strong>${contact}</strong> just submitted their details through your <strong>${BRAND_NAME}</strong> referral link. Our team will reach out and take it from here — you'll earn commission on any payments once they sign on.</p>
        <p style="margin:0 0 24px;">${button("View referral", args.referralUrl)}</p>
        ${linkFallback(args.referralUrl)}`,
  );
  const text = `${args.fullName.trim() ? `Hi ${args.fullName.trim()},` : "Hi,"}

${args.contactName} just submitted their details through your ${BRAND_NAME} referral link. Our team will reach out and take it from here.

View referral:

${args.referralUrl}

— ${BRAND_NAME}`;
  return { subject, html, text };
}

/** A self-signup application was declined — a gracious, no-CTA notice. */
export function partnerRejectedTemplate(args: { fullName: string }): EmailContent {
  const subject = `An update on your ${BRAND_NAME} application`;
  const html = shell(
    subject,
    `<p style="margin:0 0 16px;">${greeting(args.fullName)}</p>
        <p style="margin:0 0 16px;">Thank you for your interest in the <strong>${BRAND_NAME}</strong> referral program. After reviewing your application, we're unable to approve it at this time.</p>
        <p style="margin:0;">We appreciate you taking the time to apply, and we wish you all the best.</p>`,
  );
  const text = `${args.fullName.trim() ? `Hi ${args.fullName.trim()},` : "Hi,"}

Thank you for your interest in the ${BRAND_NAME} referral program. After reviewing your application, we're unable to approve it at this time.

We appreciate you taking the time to apply, and we wish you all the best.

— ${BRAND_NAME}`;
  return { subject, html, text };
}

// ── Admin-facing alerts (fan out to active admins; "Admin" eyebrow) ──

/** Reusable detail line ("Label: value") for the admin alert bodies. */
function detailRow(label: string, value: string): string {
  return `<p style="margin:0 0 6px;font-size:14px;"><span style="color:${COLORS.muted};">${escapeHtml(label)}:</span> <strong>${escapeHtml(value)}</strong></p>`;
}

/** A new self-registration application was submitted (admin alert). */
export function adminNewSignupTemplate(args: {
  adminName: string;
  applicantName: string;
  applicantEmail: string;
  companyName: string | null;
  reviewUrl: string;
}): EmailContent {
  const subject = `New partner application: ${args.applicantName}`;
  const html = shell(
    subject,
    `<p style="margin:0 0 16px;">${greeting(args.adminName)}</p>
        <p style="margin:0 0 16px;">A new partner application is waiting for review.</p>
        <div style="margin:0 0 24px;padding:14px 16px;background:${COLORS.tint};border-radius:8px;">
          ${detailRow("Name", args.applicantName)}
          ${detailRow("Email", args.applicantEmail)}
          ${args.companyName ? detailRow("Company", args.companyName) : ""}
        </div>
        <p style="margin:0 0 24px;">${button("Review application", args.reviewUrl)}</p>
        ${linkFallback(args.reviewUrl)}`,
    "Admin",
  );
  const text = `${args.adminName.trim() ? `Hi ${args.adminName.trim()},` : "Hi,"}

A new partner application is waiting for review.

Name: ${args.applicantName}
Email: ${args.applicantEmail}${args.companyName ? `\nCompany: ${args.companyName}` : ""}

Review it here:

${args.reviewUrl}

— ${BRAND_NAME}`;
  return { subject, html, text };
}

/** An invited partner accepted their invitation and finished onboarding (admin alert). */
export function adminPartnerOnboardedTemplate(args: {
  adminName: string;
  partnerName: string;
  companyName: string | null;
  partnerUrl: string;
}): EmailContent {
  const subject = `${args.partnerName} accepted their invitation`;
  const html = shell(
    subject,
    `<p style="margin:0 0 16px;">${greeting(args.adminName)}</p>
        <p style="margin:0 0 16px;"><strong>${escapeHtml(args.partnerName)}</strong>${
          args.companyName ? ` (${escapeHtml(args.companyName)})` : ""
        } has accepted their invitation and completed onboarding. They can now refer contacts.</p>
        <p style="margin:0 0 24px;">${button("View partner", args.partnerUrl)}</p>
        ${linkFallback(args.partnerUrl)}`,
    "Admin",
  );
  const text = `${args.adminName.trim() ? `Hi ${args.adminName.trim()},` : "Hi,"}

${args.partnerName}${args.companyName ? ` (${args.companyName})` : ""} has accepted their invitation and completed onboarding.

View partner:

${args.partnerUrl}

— ${BRAND_NAME}`;
  return { subject, html, text };
}

/** A new referral was added by a partner (admin alert). */
export function adminNewReferralTemplate(args: {
  adminName: string;
  partnerName: string;
  contactName: string;
  referralUrl: string;
}): EmailContent {
  const subject = `New referral from ${args.partnerName}: ${args.contactName}`;
  const html = shell(
    subject,
    `<p style="margin:0 0 16px;">${greeting(args.adminName)}</p>
        <p style="margin:0 0 16px;"><strong>${escapeHtml(args.partnerName)}</strong> submitted a new referral: <strong>${escapeHtml(args.contactName)}</strong>.</p>
        <p style="margin:0 0 24px;">${button("View referral", args.referralUrl)}</p>
        ${linkFallback(args.referralUrl)}`,
    "Admin",
  );
  const text = `${args.adminName.trim() ? `Hi ${args.adminName.trim()},` : "Hi,"}

${args.partnerName} submitted a new referral: ${args.contactName}.

View referral:

${args.referralUrl}

— ${BRAND_NAME}`;
  return { subject, html, text };
}
