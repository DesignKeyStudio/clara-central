/**
 * Notification dispatcher — the single place that decides WHO gets a notification,
 * on WHICH channels, and fans out to the email + SMS transports. Called from the
 * action layer (server actions); the service layer stays pure Prisma.
 *
 * Channel rules:
 *  - Lifecycle notifications (invite / approval / rejection) ALWAYS send by email,
 *    ignoring the recipient's toggle — you can't opt out of "your account was
 *    created", and at that point the recipient often has no prefs yet.
 *  - Informational notifications respect the recipient's `notifyByEmail` /
 *    `notifyBySms` toggles. SMS also requires a phone number on file.
 *
 * Everything is best-effort: the transports never throw and this module swallows
 * resolution errors, so a notification can never break the surrounding mutation.
 *
 * Sending self-disables exactly like the transports: email needs `RESEND_API_KEY`
 * (+ non-prototype); SMS needs `TWILIO_*` (never, for now → console log). No extra
 * feature flag gates this layer.
 */

import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { sendEmail } from "@/lib/email";
import {
  adminNewReferralTemplate,
  adminNewSignupTemplate,
  adminPartnerOnboardedTemplate,
  invoiceIssuedTemplate,
  invitePartnerTemplate,
  newLeadTemplate,
  partnerApprovedTemplate,
  partnerRejectedTemplate,
  payoutRecordedTemplate,
  referralStatusChangedTemplate,
  type EmailContent,
} from "@/lib/email/templates";
import { isDemoOrg } from "@/lib/services/organization-service";
import { sendSms, smsCopy } from "./sms";

/** A resolved recipient with the fields the dispatcher needs. */
type Recipient = {
  fullName: string;
  email: string;
  phone: string | null;
  notifyByEmail: boolean;
  notifyBySms: boolean;
};

const RECIPIENT_SELECT = {
  fullName: true,
  email: true,
  phone: true,
  notifyByEmail: true,
  notifyBySms: true,
} as const;

/** Resolve a partner (email/phone/prefs) by id, or null. */
async function partnerRecipient(partnerId: string): Promise<Recipient | null> {
  return prisma.partner
    .findUnique({ where: { id: partnerId }, select: RECIPIENT_SELECT })
    .catch(() => null);
}

/** Resolve the partner who owns a referral, or null. */
async function partnerRecipientByReferral(referralId: string): Promise<Recipient | null> {
  const row = await prisma.referral
    .findUnique({ where: { id: referralId }, select: { partner: { select: RECIPIENT_SELECT } } })
    .catch(() => null);
  return row?.partner ?? null;
}

/**
 * Every active admin OF THE GIVEN ORG — the fan-out audience for admin alerts.
 * Scoped by `OrganizationMembership` so an event in one org never notifies another
 * org's admins (role is global on UserProfile, so the membership join is the only
 * thing tying an admin to a specific org).
 */
async function adminRecipients(organizationId: string): Promise<Recipient[]> {
  return prisma.userProfile
    .findMany({
      where: {
        role: "admin",
        isActive: true,
        memberships: { some: { organizationId } },
      },
      select: RECIPIENT_SELECT,
    })
    .catch(() => []);
}

/**
 * Fan a single notification out to a set of recipients across channels, honoring
 * prefs (unless `lifecycle`). `email` / `sms` are per-recipient builders so the
 * greeting can be personalized. Best-effort throughout.
 *
 * `organizationId` gates the whole fan-out: a demo org sends nothing (no real mail
 * from the sandbox).
 */
async function dispatch(opts: {
  organizationId: string;
  label: string;
  recipients: Recipient[];
  lifecycle?: boolean;
  email?: (r: Recipient) => EmailContent;
  sms?: (r: Recipient) => string;
}): Promise<void> {
  if (await isDemoOrg(opts.organizationId)) return;
  await Promise.all(
    opts.recipients.map(async (r) => {
      if (opts.email && (opts.lifecycle || r.notifyByEmail)) {
        await sendEmail(r.email, opts.email(r), opts.label).catch(() => {});
      }
      if (opts.sms && r.phone && (opts.lifecycle || r.notifyBySms)) {
        await sendSms(r.phone, opts.sms(r), opts.label).catch(() => {});
      }
    }),
  );
}

// ── Partner lifecycle (email only, ignore prefs) ──────────────────────────────

/**
 * Invite a partner to onboard. Lifecycle → always emails. The invitee has no
 * partner row / prefs yet, so this takes the address directly and returns whether
 * Resend accepted it (the invite dialog surfaces this). A demo org sends nothing
 * and reports `false` (not accepted).
 */
export async function notifyPartnerInvited(args: {
  organizationId: string;
  to: string;
  fullName: string;
  link: string;
}): Promise<boolean> {
  if (await isDemoOrg(args.organizationId)) return false;
  return sendEmail(args.to, invitePartnerTemplate({ fullName: args.fullName, link: args.link }), "partner-invite");
}

/** Tell a self-signup applicant they're approved. Lifecycle → always emails. */
export async function notifyPartnerApproved(args: {
  organizationId: string;
  to: string;
  fullName: string;
  loginUrl: string;
}): Promise<void> {
  if (await isDemoOrg(args.organizationId)) return;
  await sendEmail(
    args.to,
    partnerApprovedTemplate({ fullName: args.fullName, loginUrl: args.loginUrl }),
    "partner-approved",
  ).catch(() => {});
}

/** Tell a self-signup applicant their application was declined. Lifecycle → always emails. */
export async function notifyPartnerRejected(args: {
  organizationId: string;
  to: string;
  fullName: string;
}): Promise<void> {
  if (await isDemoOrg(args.organizationId)) return;
  await sendEmail(
    args.to,
    partnerRejectedTemplate({ fullName: args.fullName }),
    "partner-rejected",
  ).catch(() => {});
}

// ── Partner informational (respect prefs; email + SMS) ────────────────────────

/** A new lead arrived via the partner's shareable link. */
export async function notifyNewLead(args: {
  organizationId: string;
  partnerId: string;
  contactName: string;
  referralUrl: string;
}): Promise<void> {
  const r = await partnerRecipient(args.partnerId);
  if (!r) return;
  await dispatch({
    organizationId: args.organizationId,
    label: "new-lead",
    recipients: [r],
    email: (rec) =>
      newLeadTemplate({ fullName: rec.fullName, contactName: args.contactName, referralUrl: args.referralUrl }),
    sms: () => smsCopy.newLead(args.contactName, args.referralUrl),
  });
}

/** A referral reached a notable pipeline status. */
export async function notifyReferralStatusChanged(args: {
  organizationId: string;
  referralId: string;
  contactName: string;
  statusLabel: string;
  referralUrl: string;
}): Promise<void> {
  const r = await partnerRecipientByReferral(args.referralId);
  if (!r) return;
  await dispatch({
    organizationId: args.organizationId,
    label: "referral-status",
    recipients: [r],
    email: (rec) =>
      referralStatusChangedTemplate({
        fullName: rec.fullName,
        contactName: args.contactName,
        statusLabel: args.statusLabel,
        referralUrl: args.referralUrl,
      }),
    sms: () => smsCopy.referralStatus(args.contactName, args.statusLabel, args.referralUrl),
  });
}

/** A new client invoice was raised on the partner's referral. */
export async function notifyInvoiceIssued(args: {
  organizationId: string;
  referralId: string;
  contactName: string;
  invoiceNumber: string;
  amount: number;
  referralUrl: string;
}): Promise<void> {
  const r = await partnerRecipientByReferral(args.referralId);
  if (!r) return;
  await dispatch({
    organizationId: args.organizationId,
    label: "invoice-issued",
    recipients: [r],
    email: (rec) =>
      invoiceIssuedTemplate({
        fullName: rec.fullName,
        contactName: args.contactName,
        invoiceNumber: args.invoiceNumber,
        amount: args.amount,
        referralUrl: args.referralUrl,
      }),
    sms: () =>
      smsCopy.invoiceIssued(args.invoiceNumber, formatCurrency(args.amount), args.contactName, args.referralUrl),
  });
}

/** A commission payout was recorded to the partner's account. */
export async function notifyPayoutRecorded(args: {
  organizationId: string;
  partnerId: string;
  amount: number;
  note: string | null;
  earningsUrl: string;
}): Promise<void> {
  const r = await partnerRecipient(args.partnerId);
  if (!r) return;
  await dispatch({
    organizationId: args.organizationId,
    label: "payout-recorded",
    recipients: [r],
    email: (rec) =>
      payoutRecordedTemplate({
        fullName: rec.fullName,
        amount: args.amount,
        note: args.note,
        earningsUrl: args.earningsUrl,
      }),
    sms: () => smsCopy.payoutRecorded(formatCurrency(args.amount), args.earningsUrl),
  });
}

// ── Admin informational (fan out to active admins; respect prefs) ─────────────

/** A new self-registration application was submitted. */
export async function notifyAdminNewSignup(args: {
  organizationId: string;
  applicantName: string;
  applicantEmail: string;
  companyName: string | null;
  reviewUrl: string;
}): Promise<void> {
  const admins = await adminRecipients(args.organizationId);
  await dispatch({
    organizationId: args.organizationId,
    label: "admin-new-signup",
    recipients: admins,
    email: (rec) =>
      adminNewSignupTemplate({
        adminName: rec.fullName,
        applicantName: args.applicantName,
        applicantEmail: args.applicantEmail,
        companyName: args.companyName,
        reviewUrl: args.reviewUrl,
      }),
    sms: () => smsCopy.adminNewSignup(args.applicantName, args.reviewUrl),
  });
}

/** An invited partner accepted their invitation and finished onboarding. */
export async function notifyAdminPartnerOnboarded(args: {
  organizationId: string;
  partnerName: string;
  companyName: string | null;
  partnerUrl: string;
}): Promise<void> {
  const admins = await adminRecipients(args.organizationId);
  await dispatch({
    organizationId: args.organizationId,
    label: "admin-partner-onboarded",
    recipients: admins,
    email: (rec) =>
      adminPartnerOnboardedTemplate({
        adminName: rec.fullName,
        partnerName: args.partnerName,
        companyName: args.companyName,
        partnerUrl: args.partnerUrl,
      }),
    sms: () => smsCopy.adminOnboarded(args.partnerName, args.partnerUrl),
  });
}

/**
 * A new referral was added by a partner (link lead or portal submission). Resolves
 * the attributed partner's name from `partnerId` so both call sites pass the same
 * shape.
 */
export async function notifyAdminNewReferral(args: {
  organizationId: string;
  partnerId: string;
  contactName: string;
  referralUrl: string;
}): Promise<void> {
  const [partner, admins] = await Promise.all([
    prisma.partner
      .findUnique({ where: { id: args.partnerId }, select: { fullName: true } })
      .catch(() => null),
    adminRecipients(args.organizationId),
  ]);
  const partnerName = partner?.fullName ?? "A partner";
  await dispatch({
    organizationId: args.organizationId,
    label: "admin-new-referral",
    recipients: admins,
    email: (rec) =>
      adminNewReferralTemplate({
        adminName: rec.fullName,
        partnerName,
        contactName: args.contactName,
        referralUrl: args.referralUrl,
      }),
    sms: () => smsCopy.adminNewReferral(partnerName, args.contactName, args.referralUrl),
  });
}
