import { randomBytes } from "node:crypto";
import { addDays } from "date-fns";
import type { invite_status, PartnerInvite } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { newReferralCode } from "@/lib/ids";
import { toISOString, toNumber } from "@/lib/actions/mappers";
import { emailInUse } from "@/lib/services/partner-service";

// Admin → partner invitations. The stored-token replacement for the prototype's
// stateless `/invite?data=` URL: an invite row carries the onboarding prefill +
// commission rate, and acceptance provisions the Partner (already approved,
// `entryType: invited`) linked to its freshly-created auth user.

/** How long an invitation link stays valid. */
const INVITE_TTL_DAYS = 14;

/** "Invited by …" is fixed for admin-invited partners (vs. self-signup answers). */
const INVITED_HOW_DID_YOU_HEAR = "Invited by Clara Central";

/** Raised when an admin invites an email that already belongs to a partner. */
export class PartnerExistsError extends Error {
  constructor() {
    super("A partner with this email already exists.");
    this.name = "PartnerExistsError";
  }
}

/** Raised when a still-valid (pending, unexpired) invite already exists for the email. */
export class ActiveInviteExistsError extends Error {
  constructor() {
    super("An active invite already exists for this email.");
    this.name = "ActiveInviteExistsError";
  }
}

/** Raised when an email already belongs to a non-partner account (e.g. an admin). */
export class AccountExistsError extends Error {
  constructor() {
    super("This email is already associated with an existing account.");
    this.name = "AccountExistsError";
  }
}

export type CreatePartnerInviteInput = {
  fullName: string | null;
  email: string;
  companyName: string | null;
  location: string | null;
  website: string | null;
  commissionRate: number;
};

/** Onboarding prefill the public `/invite/[token]` page renders into its form. */
export type InvitePrefill = {
  token: string;
  /** The org the invite belongs to — derived from the invite, used to provision the partner in the right org. */
  organizationId: string;
  email: string;
  fullName: string;
  companyName: string;
  location: string;
  website: string;
};

/** The (already-validated) fields the invitee submits to finish onboarding. */
export type OnboardingData = {
  fullName: string;
  phone: string | null;
  companyName: string | null;
  role: string | null;
  location: string | null;
  website: string | null;
  typesOfReferrals: string | null;
};

/**
 * Generate a token + persist a pending invitation. Throws {@link PartnerExistsError}
 * if a partner already exists for `email`, or {@link AccountExistsError} if the
 * email belongs to another account (e.g. an admin). `email` is expected
 * pre-normalized (trimmed + lowercased) by the caller.
 */
export async function createPartnerInvite(
  organizationId: string,
  input: CreatePartnerInviteInput,
  createdByUserId: string,
): Promise<PartnerInvite> {
  // Email must be free across BOTH partners (within this org) and user profiles
  // (admins live in user_profiles with no Partner row; global identity),
  // case-insensitively.
  const inUse = await emailInUse(input.email, { organizationId });
  if (inUse.partner) throw new PartnerExistsError();
  if (inUse.profile) throw new AccountExistsError();

  // One active invite per email — block a second still-valid (pending, unexpired) one.
  const activeInvite = await prisma.partnerInvite.findFirst({
    where: {
      organizationId,
      email: input.email,
      status: "pending",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true },
  });
  if (activeInvite) throw new ActiveInviteExistsError();

  const token = randomBytes(32).toString("base64url");

  return prisma.partnerInvite.create({
    data: {
      organizationId,
      email: input.email,
      token,
      fullName: input.fullName,
      companyName: input.companyName,
      location: input.location,
      website: input.website,
      commissionRate: input.commissionRate,
      status: "pending",
      expiresAt: addDays(new Date(), INVITE_TTL_DAYS),
      createdByUserId,
    },
  });
}

/**
 * The still-active invite for an email, or null. "Active" = pending AND unexpired
 * — the same predicate {@link createPartnerInvite} uses to block a second invite.
 * Used by the self-signup flow to route an already-invited applicant to their link
 * instead of creating a duplicate partner.
 */
export async function getActiveInviteByEmail(
  organizationId: string,
  email: string,
): Promise<{ id: string } | null> {
  return prisma.partnerInvite.findFirst({
    where: {
      organizationId,
      email,
      status: "pending",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true },
  });
}

/** One row of the admin "Invitations" section — an outstanding (pending) invite. */
export type InviteListRow = {
  id: string;
  email: string;
  fullName: string | null;
  companyName: string | null;
  /** Onboarding token, for the copyable `/invite/{token}` link. */
  token: string;
  commissionRate: number;
  invitedByName: string | null;
  createdAt: string; // ISO datetime
  expiresAt: string | null; // ISO datetime
  /** True when `expiresAt` has passed — the link no longer onboards until resent. */
  isExpired: boolean;
};

/**
 * Outstanding invites (status `pending`) for the admin Partners page, newest first.
 * Accepted/revoked invites are excluded; expiry is derived on read (nothing writes
 * the `expired` enum value) so an expired-but-unaccepted invite still shows, flagged.
 */
export async function listActiveInvites(organizationId: string): Promise<InviteListRow[]> {
  const now = new Date();
  const invites = await prisma.partnerInvite.findMany({
    where: { organizationId, status: "pending" },
    orderBy: { createdAt: "desc" },
    include: { createdByUser: { select: { fullName: true } } },
  });
  return invites.map((i) => ({
    id: i.id,
    email: i.email,
    fullName: i.fullName,
    companyName: i.companyName,
    token: i.token,
    commissionRate: toNumber(i.commissionRate),
    invitedByName: i.createdByUser?.fullName ?? null,
    createdAt: toISOString(i.createdAt),
    expiresAt: i.expiresAt ? toISOString(i.expiresAt) : null,
    isExpired: i.expiresAt ? i.expiresAt < now : false,
  }));
}

/**
 * Revoke a pending invite (sets the `revoked` status), freeing the email for a
 * fresh invite or self-signup. Returns the invite's email + prior status for the
 * audit log, or null if no such invite exists. A no-op for a non-pending invite.
 */
export async function revokeInvite(
  organizationId: string,
  inviteId: string,
): Promise<{ email: string; previousStatus: invite_status } | null> {
  const invite = await prisma.partnerInvite.findFirst({
    where: { id: inviteId, organizationId },
    select: { email: true, status: true },
  });
  if (!invite) return null;
  if (invite.status === "pending") {
    await prisma.partnerInvite.update({ where: { id: inviteId }, data: { status: "revoked" } });
  }
  return { email: invite.email, previousStatus: invite.status };
}

/**
 * Refresh a pending invite's expiry (now + {@link INVITE_TTL_DAYS}), keeping the
 * same token, so the admin can re-send the same link. Returns the details the
 * action needs to rebuild the link + send the email, or null if the invite is
 * missing or no longer pending (accepted/revoked).
 */
export async function resendInvite(
  organizationId: string,
  inviteId: string,
): Promise<{ token: string; email: string; fullName: string | null; expiresAt: Date } | null> {
  const invite = await prisma.partnerInvite.findFirst({ where: { id: inviteId, organizationId } });
  if (!invite || invite.status !== "pending") return null;
  const expiresAt = addDays(new Date(), INVITE_TTL_DAYS);
  await prisma.partnerInvite.update({ where: { id: inviteId }, data: { expiresAt } });
  return { token: invite.token, email: invite.email, fullName: invite.fullName, expiresAt };
}

/**
 * Return onboarding prefill for a token, or `null` if the invite is missing,
 * not pending (revoked/accepted), or past its expiry.
 */
export async function getValidInviteByToken(token: string): Promise<InvitePrefill | null> {
  const invite = await prisma.partnerInvite.findUnique({ where: { token } });
  if (!invite || invite.status !== "pending") return null;
  if (invite.expiresAt && invite.expiresAt < new Date()) return null;

  return {
    token: invite.token,
    organizationId: invite.organizationId,
    email: invite.email,
    fullName: invite.fullName ?? "",
    companyName: invite.companyName ?? "",
    location: invite.location ?? "",
    website: invite.website ?? "",
  };
}

/**
 * Provision an invited partner in one transaction: create their UserProfile
 * (mirroring the already-created auth user `userId`), create the approved
 * Partner (entryType `invited`, commission rate from the invite, email locked to
 * the invite), and mark the invite accepted. Throws if the invite is no longer
 * valid (re-checked inside the transaction to close the race window).
 */
export async function acceptInvite(
  token: string,
  userId: string,
  data: OnboardingData,
): Promise<{ partnerId: string; email: string; inviteId: string }> {
  return prisma.$transaction(async (tx) => {
    const invite = await tx.partnerInvite.findUnique({ where: { token } });
    if (!invite || invite.status !== "pending") {
      throw new Error("This invitation is no longer valid.");
    }
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new Error("This invitation has expired.");
    }

    await tx.userProfile.create({
      data: {
        id: userId,
        email: invite.email,
        fullName: data.fullName,
        role: "partner",
      },
    });

    // Link the new user into the invite's org (idempotent on @@unique([userId, organizationId])).
    await tx.organizationMembership.upsert({
      where: { userId_organizationId: { userId, organizationId: invite.organizationId } },
      create: { userId, organizationId: invite.organizationId },
      update: {},
    });

    const partner = await tx.partner.create({
      data: {
        organizationId: invite.organizationId,
        userId,
        email: invite.email,
        fullName: data.fullName,
        phone: data.phone,
        companyName: data.companyName,
        role: data.role,
        location: data.location,
        website: data.website,
        howDidYouHear: INVITED_HOW_DID_YOU_HEAR,
        typesOfReferrals: data.typesOfReferrals,
        status: "approved",
        entryType: "invited",
        commissionRate: invite.commissionRate,
        referralCode: newReferralCode(data.fullName),
      },
      select: { id: true, email: true },
    });

    await tx.partnerInvite.update({
      where: { token },
      data: { status: "accepted", acceptedAt: new Date(), partnerId: partner.id },
    });

    return { partnerId: partner.id, email: partner.email, inviteId: invite.id };
  });
}
