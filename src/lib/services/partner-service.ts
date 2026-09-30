import type {
  invoice_status,
  partner_entry_type,
  partner_status,
  referral_status,
} from "@prisma/client";
import type { Decimal } from "@prisma/client/runtime/library";
import { addMonths } from "date-fns";
import { prisma } from "@/lib/prisma";
import { newReferralCode } from "@/lib/ids";
import { toDateString, toISOString, toNumber } from "@/lib/actions/mappers";
import { getAppConfig } from "@/lib/services/app-config-service";

// ── View-models ──
// The real source of truth for the admin Partners feature. The service computes
// these from Partner → Referral → Invoice → Payout. The sibling
// `referral-service.ts` reuses `CommissionState`, `PartnerReferralRow`, and the
// `round2` / `commissionWindow` helpers exported below.

/**
 * Lifecycle of a referral's commission window:
 * - `active` — window open, still earning ("Until {date}")
 * - `contract_ended` — client's contract ended before the window closed ("Ended {date}")
 * - `expired` — window reached its natural end ("Expired {date}")
 */
export type CommissionState = "active" | "contract_ended" | "expired";

/**
 * One row of the admin Partners list. Combines Partner columns with derived
 * aggregates (commission paid/owed, referral & invoice counts).
 */
export type PartnerListRow = {
  id: string;
  fullName: string;
  email: string;
  companyName: string;
  status: partner_status;
  entryType: partner_entry_type;
  /** Public URL of the partner's profile picture, or null. */
  avatarUrl: string | null;
  /** The partner's commission rate (%), applied to all their referrals. */
  rate: number;
  referralCount: number;
  invoiceCount: number;
  commissionPaid: number;
  commissionOwed: number;
  joinedAt: string; // ISO date
  lastLoginAt: string | null; // ISO datetime
};

/** One row of a partner's "Their referrals" table on the detail page. */
export type PartnerReferralRow = {
  id: string;
  contactName: string;
  contactEmail: string | null;
  contactCompany: string | null;
  status: referral_status;
  /** Commission rate (%) applied to this referral. */
  commissionRate: number;
  /** Lifecycle of this referral's commission window. */
  commissionState: CommissionState;
  /** Boundary date for the commission state — window end (active), contract end
   *  (`contract_ended`), or expiry (`expired`). ISO date. */
  commissionUntil: string;
  /** Commission earned on this referral so far (USD; 0 when nothing earned yet). */
  earned: number;
  /** When the referral was submitted (ISO date). */
  createdAt: string;
};

/** Full view-model for the admin partner detail page. */
export type PartnerDetail = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  website: string | null;
  companyName: string | null;
  role: string | null;
  location: string | null;
  status: partner_status;
  entryType: partner_entry_type;
  /** Public URL of the partner's profile picture, or null. */
  avatarUrl: string | null;
  commissionRate: number;
  joinedAt: string; // ISO date
  lastLoginAt: string | null; // ISO datetime
  howDidYouHear: string | null; // self-signup only
  typesOfReferrals: string | null; // self-signup only
  referralCount: number;
  /** Referrals that have converted (status `deal_closed`). */
  conversionsCount: number;
  invoiceCount: number;
  commissionEarned: number;
  commissionPaid: number;
  commissionOwed: number;
  payoutCount: number;
  referrals: PartnerReferralRow[];
};

// ── Helpers ──

/** Round a money/percent value to two decimals (guards float drift). */
export const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Derive the commission-window state + boundary for a referral (domain Rules 3-4).
 * The window opens at `createdAt` and closes at the EARLIER of the natural timeout
 * (`createdAt + validMonths`) and a manually-set `contractEndedAt`:
 *
 *   closeDate = MIN(createdAt + validMonths, contractEndedAt?)
 *
 * State is derived from `now` vs. `closeDate`:
 * - `active`         — window still open. The natural timeout is the `now < timeout`
 *                       instant; a future-dated `contractEndedAt` also reads active
 *                       until its calendar day arrives.
 * - `contract_ended` — `contractEndedAt` is set, precedes the timeout, and its
 *                       calendar day has arrived (`today >= contractEndedAt` — a DATE
 *                       comparison, since `@db.Date` has no time component, so a
 *                       same-day "Mark contract ended" reads as ended immediately)
 * - `expired`        — window closed by the natural timeout (no early contract end,
 *                       or the contract end falls on/after the timeout)
 *
 * `closeDate` is the boundary that decides which paid invoices earn commission
 * (see `windowedCommission`); `until` is its display string.
 */
export function commissionWindow(
  createdAt: Date,
  contractEndedAt: Date | null,
  validMonths: number,
  now: Date = new Date(),
): { state: CommissionState; until: string; closeDate: Date } {
  const timeoutDate = addMonths(createdAt, validMonths);
  // The contract end only closes the window early when it precedes the timeout.
  const endedEarly = contractEndedAt !== null && contractEndedAt < timeoutDate;
  const closeDate = endedEarly && contractEndedAt !== null ? contractEndedAt : timeoutDate;

  let state: CommissionState;
  if (endedEarly && contractEndedAt !== null) {
    // `contractEndedAt` is a calendar date (`@db.Date` → UTC midnight). Per the
    // commission-engine spec the window becomes `contract_ended` once *today* ≥
    // that date — a CALENDAR comparison. Comparing the raw `now` instant against
    // the UTC-midnight boundary leaves a same-day "Mark contract ended" reading as
    // still-active until the UTC clock crosses midnight (timezone-dependent), so
    // compare date-only — the contract-end day itself reads as ended.
    state = toDateString(now) >= toDateString(contractEndedAt) ? "contract_ended" : "active";
  } else {
    // Natural timeout is a true instant anchored on `createdAt`.
    state = now < timeoutDate ? "active" : "expired";
  }
  // `until` is display-only. The natural timeout is an INSTANT (anchored on the
  // referral's `createdAt`), so serialize it full-precision and let the client render
  // it in the viewer's timezone. A manual `contractEndedAt` is a calendar date
  // (`@db.Date`) — serialize it date-only so it shows the same day for everyone.
  const until = endedEarly && contractEndedAt !== null ? toDateString(closeDate) : toISOString(closeDate);
  return { state, until, closeDate };
}

/** Minimal invoice shape needed to derive commission. */
type CommissionInvoice = { amount: Decimal; status: invoice_status; issuedDate: Date };

/**
 * Commission earned from a referral's invoices (domain Rule 1): only invoices that
 * are `paid` AND issued on/before the window `closeDate` contribute. Pass the
 * `closeDate` from `commissionWindow()`. Returns a 2-decimal-rounded USD amount.
 */
export function windowedCommission(
  invoices: CommissionInvoice[],
  rate: number,
  closeDate: Date,
): number {
  return round2(
    invoices
      .filter((inv) => inv.status === "paid" && inv.issuedDate <= closeDate)
      .reduce((sum, inv) => sum + (toNumber(inv.amount) * rate) / 100, 0),
  );
}

// ── Queries ──

/** All partners with derived commission aggregates, newest first. */
export async function listPartners(organizationId: string): Promise<PartnerListRow[]> {
  const { commissionValidMonths } = await getAppConfig(organizationId);
  const partners = await prisma.partner.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      companyName: true,
      status: true,
      entryType: true,
      avatarUrl: true,
      commissionRate: true,
      createdAt: true,
      lastLoginAt: true,
      _count: { select: { referrals: true, invoices: true } },
      // Grouped by referral so each referral's commission window + snapshot rate
      // can be applied (Rule 1; TKT-005 — earned uses the referral's own rate).
      referrals: {
        select: {
          createdAt: true,
          contractEndedAt: true,
          commissionRate: true,
          invoices: {
            where: { status: "paid" },
            select: { amount: true, status: true, issuedDate: true },
          },
        },
      },
      payouts: { select: { amount: true } },
    },
  });

  return partners.map((p) => {
    // Partner's CURRENT rate (for display); earned commission below uses each
    // referral's snapshot rate, so a rate edit doesn't re-price past referrals.
    const rate = toNumber(p.commissionRate);
    const earned = round2(
      p.referrals.reduce((sum, r) => {
        const { closeDate } = commissionWindow(r.createdAt, r.contractEndedAt, commissionValidMonths);
        return sum + windowedCommission(r.invoices, toNumber(r.commissionRate), closeDate);
      }, 0),
    );
    const paid = round2(p.payouts.reduce((sum, po) => sum + toNumber(po.amount), 0));
    return {
      id: p.id,
      fullName: p.fullName,
      email: p.email,
      companyName: p.companyName ?? "—",
      status: p.status,
      entryType: p.entryType,
      avatarUrl: p.avatarUrl,
      rate,
      referralCount: p._count.referrals,
      invoiceCount: p._count.invoices,
      commissionPaid: paid,
      commissionOwed: round2(earned - paid),
      joinedAt: toISOString(p.createdAt),
      lastLoginAt: p.lastLoginAt ? toISOString(p.lastLoginAt) : null,
    };
  });
}

/** A single partner's full detail (with referrals + commission KPIs), or null. */
export async function getPartnerDetail(
  organizationId: string,
  id: string,
): Promise<PartnerDetail | null> {
  const p = await prisma.partner.findFirst({
    where: { id, organizationId },
    include: {
      referrals: {
        orderBy: { createdAt: "desc" },
        include: {
          invoices: {
            where: { status: "paid" },
            select: { amount: true, status: true, issuedDate: true },
          },
        },
      },
      payouts: { select: { amount: true } },
      _count: { select: { referrals: true, invoices: true, payouts: true } },
    },
  });

  if (!p) return null;

  // Partner's CURRENT rate — shown in the header + used to prefill the edit dialog.
  // Each referral's earned commission below uses ITS OWN snapshot rate (TKT-005).
  const rate = toNumber(p.commissionRate);
  const { commissionValidMonths } = await getAppConfig(organizationId);

  const referrals: PartnerReferralRow[] = p.referrals.map((r) => {
    const referralRate = toNumber(r.commissionRate);
    const window = commissionWindow(r.createdAt, r.contractEndedAt, commissionValidMonths);
    const earned = windowedCommission(r.invoices, referralRate, window.closeDate);
    return {
      id: r.id,
      contactName: r.contactName,
      contactEmail: r.contactEmail,
      contactCompany: r.contactCompany,
      status: r.status,
      commissionRate: referralRate,
      commissionState: window.state,
      commissionUntil: window.until,
      earned,
      createdAt: toISOString(r.createdAt),
    };
  });

  const commissionEarned = round2(referrals.reduce((sum, r) => sum + r.earned, 0));
  const conversionsCount = p.referrals.filter((r) => r.status === "deal_closed").length;
  const commissionPaid = round2(p.payouts.reduce((sum, po) => sum + toNumber(po.amount), 0));

  return {
    id: p.id,
    fullName: p.fullName,
    email: p.email,
    phone: p.phone,
    website: p.website,
    companyName: p.companyName,
    role: p.role,
    location: p.location,
    status: p.status,
    entryType: p.entryType,
    avatarUrl: p.avatarUrl,
    commissionRate: rate,
    joinedAt: toISOString(p.createdAt),
    lastLoginAt: p.lastLoginAt ? toISOString(p.lastLoginAt) : null,
    howDidYouHear: p.howDidYouHear,
    typesOfReferrals: p.typesOfReferrals,
    referralCount: p._count.referrals,
    conversionsCount,
    invoiceCount: p._count.invoices,
    commissionEarned,
    commissionPaid,
    commissionOwed: round2(commissionEarned - commissionPaid),
    payoutCount: p._count.payouts,
    referrals,
  };
}

// ── Mutations ──

/** Editable partner fields (empty optionals already normalized to null). */
export type PartnerUpdateInput = {
  fullName: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  role: string | null;
  location: string | null;
  website: string | null;
  /** Single per-partner rate — applied to all their referrals. */
  commissionRate: number;
};

/** Update a partner's details and return the refreshed detail view-model. */
export async function updatePartner(
  organizationId: string,
  id: string,
  data: PartnerUpdateInput,
): Promise<PartnerDetail | null> {
  const owned = await prisma.partner.findFirst({
    where: { id, organizationId },
    select: { id: true },
  });
  if (!owned) return null;
  await prisma.partner.update({ where: { id }, data });
  return getPartnerDetail(organizationId, id);
}

/** Set a partner's lifecycle status (approve / reject from the list). */
export async function setPartnerStatus(
  organizationId: string,
  id: string,
  status: partner_status,
): Promise<void> {
  await prisma.partner.updateMany({ where: { id, organizationId }, data: { status } });
}

/**
 * Point-in-time snapshot of a deleted partner — what the cascade removed, for the
 * audit log — plus the linked `userId` so the action can also tear down the
 * partner's auth user.
 */
export type DeletedPartner = {
  id: string;
  fullName: string;
  email: string;
  companyName: string | null;
  status: partner_status;
  entryType: partner_entry_type;
  commissionRate: number;
  /** Linked Supabase/UserProfile id, or null if the partner never had a login. */
  userId: string | null;
  referralCount: number;
  invoiceCount: number;
  payoutCount: number;
};

/**
 * Permanently delete a partner. Their referrals, invoices, and payouts cascade at
 * the DB level (all `onDelete: Cascade` → Partner); `PartnerInvite.partnerId` is
 * nulled (`SetNull`) so historical invites are retained. The linked `UserProfile`
 * / auth user is NOT removed here — that's the caller's decision (see
 * `deletePartnerAction`). Returns a snapshot of what was removed (with the linked
 * `userId`), or null when no such partner exists.
 */
export async function deletePartner(
  organizationId: string,
  partnerId: string,
): Promise<DeletedPartner | null> {
  const p = await prisma.partner.findFirst({
    where: { id: partnerId, organizationId },
    select: {
      id: true,
      fullName: true,
      email: true,
      companyName: true,
      status: true,
      entryType: true,
      commissionRate: true,
      userId: true,
      _count: { select: { referrals: true, invoices: true, payouts: true } },
    },
  });
  if (!p) return null;

  await prisma.partner.delete({ where: { id: partnerId } });

  return {
    id: p.id,
    fullName: p.fullName,
    email: p.email,
    companyName: p.companyName,
    status: p.status,
    entryType: p.entryType,
    commissionRate: toNumber(p.commissionRate),
    userId: p.userId,
    referralCount: p._count.referrals,
    invoiceCount: p._count.invoices,
    payoutCount: p._count.payouts,
  };
}

/** A public self-registration application (no auth user yet; awaits approval). */
export type SelfSignupInput = {
  fullName: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  role: string | null;
  location: string | null;
  website: string | null;
  howDidYouHear: string | null;
  typesOfReferrals: string | null;
};

/**
 * Is `email` already tied to any account — a Partner row OR a UserProfile (where
 * Admins live)? Case-insensitive, matching the Partner-to-Partner validation.
 * The `partner` check is scoped to `organizationId` when given (Partner.email is
 * unique per-org now); the `profile` check is always global (UserProfile.email is
 * the global auth identity). `partnerId`/`userId` omit the caller's own rows (edit
 * flows). Returns which table(s) matched so callers can tailor the message.
 */
export async function emailInUse(
  email: string,
  opts?: { organizationId?: string; partnerId?: string; userId?: string },
): Promise<{ partner: boolean; profile: boolean }> {
  const [partnerHit, profileHit] = await Promise.all([
    prisma.partner.findFirst({
      where: {
        ...(opts?.organizationId ? { organizationId: opts.organizationId } : {}),
        email: { equals: email, mode: "insensitive" },
        ...(opts?.partnerId ? { NOT: { id: opts.partnerId } } : {}),
      },
      select: { id: true },
    }),
    prisma.userProfile.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
        ...(opts?.userId ? { NOT: { id: opts.userId } } : {}),
      },
      select: { id: true },
    }),
  ]);
  return { partner: Boolean(partnerHit), profile: Boolean(profileHit) };
}

/**
 * Create a pending self-signup application. No auth user is provisioned — that
 * happens at admin approval (see `approveSelfSignupPartner`). Commission rate is
 * set from the system standard rate (`AppConfig.standardCommissionRate`); admin
 * can adjust it later. Throws Prisma P2002 if the email already belongs to a partner.
 */
export async function createSelfSignupApplication(
  organizationId: string,
  data: SelfSignupInput,
): Promise<{ id: string }> {
  const { standardCommissionRate } = await getAppConfig(organizationId);
  return prisma.partner.create({
    data: {
      ...data,
      organizationId,
      status: "pending",
      entryType: "self_signup",
      commissionRate: standardCommissionRate,
      referralCode: newReferralCode(data.fullName),
    },
    select: { id: true },
  });
}

/**
 * Resolve the partner behind a public referral code (for the `/r/[code]` landing
 * and the public lead-capture action). Returns display-safe fields + the owner's
 * email (for the best-effort "new lead" notification), or null when no partner
 * carries that code. Callers gate on `status === "approved"` — only an approved
 * partner's link captures leads; every other case reads as "unavailable" so the
 * code never reveals a pending/rejected partner.
 */
export async function getPartnerByReferralCode(code: string): Promise<{
  id: string;
  organizationId: string;
  fullName: string;
  email: string;
  companyName: string | null;
  status: partner_status;
} | null> {
  return prisma.partner.findUnique({
    where: { referralCode: code },
    select: {
      id: true,
      organizationId: true,
      fullName: true,
      email: true,
      companyName: true,
      status: true,
    },
  });
}

/**
 * Link a freshly-created auth user to a pending self-signup partner and approve
 * it, in one transaction. The Supabase auth user is created by the caller (the
 * approve action) before this runs.
 */
export async function approveSelfSignupPartner(
  organizationId: string,
  partnerId: string,
  userId: string,
  email: string,
  fullName: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const owned = await tx.partner.findFirst({
      where: { id: partnerId, organizationId },
      select: { id: true },
    });
    if (!owned) return;
    await tx.userProfile.create({ data: { id: userId, email, fullName, role: "partner" } });
    // Link the new auth user to this org — without it getSessionContext has no
    // active org to resolve and the partner can't sign in.
    await tx.organizationMembership.create({ data: { userId, organizationId } });
    await tx.partner.update({ where: { id: partnerId }, data: { userId, status: "approved" } });
  });
}

// ── Partner portal ──

/** Identity + rate + portfolio KPIs, for the partner portal's header and dashboards. */
export type PartnerSummary = {
  fullName: string;
  companyName: string | null;
  /** Public code for the partner's shareable referral link (`/r/{referralCode}`). */
  referralCode: string;
  /** The partner's commission rate (%), applied to all their referrals. */
  commissionRate: number;
  /** Total referrals submitted by this partner. */
  referralCount: number;
  /** Referrals that have converted (status `deal_closed`). */
  conversionsCount: number;
  /** Commission earned across all referrals (windowed; USD). */
  commissionEarned: number;
  /** Commission actually paid out to the partner (USD). */
  commissionPaid: number;
  /** Outstanding commission still owed (earned − paid; USD). */
  commissionOwed: number;
};

/** A partner's own identity, rate, and portfolio KPIs (for their portal), or null if missing. */
export async function getPartnerSummary(
  organizationId: string,
  partnerId: string,
): Promise<PartnerSummary | null> {
  const p = await prisma.partner.findFirst({
    where: { id: partnerId, organizationId },
    select: {
      fullName: true,
      companyName: true,
      referralCode: true,
      commissionRate: true,
      referrals: {
        select: {
          status: true,
          createdAt: true,
          contractEndedAt: true,
          commissionRate: true,
          invoices: {
            where: { status: "paid" },
            select: { amount: true, status: true, issuedDate: true },
          },
        },
      },
      payouts: { select: { amount: true } },
    },
  });
  if (!p) return null;

  // Partner's CURRENT rate (shown in the portal + used for new referrals); earned
  // commission below uses each referral's own snapshot rate (TKT-005).
  const rate = toNumber(p.commissionRate);
  const { commissionValidMonths } = await getAppConfig(organizationId);
  const commissionEarned = round2(
    p.referrals.reduce((sum, r) => {
      const { closeDate } = commissionWindow(r.createdAt, r.contractEndedAt, commissionValidMonths);
      return sum + windowedCommission(r.invoices, toNumber(r.commissionRate), closeDate);
    }, 0),
  );
  const commissionPaid = round2(p.payouts.reduce((sum, po) => sum + toNumber(po.amount), 0));

  return {
    fullName: p.fullName,
    companyName: p.companyName,
    referralCode: p.referralCode,
    commissionRate: rate,
    referralCount: p.referrals.length,
    conversionsCount: p.referrals.filter((r) => r.status === "deal_closed").length,
    commissionEarned,
    commissionPaid,
    commissionOwed: round2(commissionEarned - commissionPaid),
  };
}

/** The signed-in partner's own editable profile (email is read-only display only). */
export type PartnerProfile = {
  fullName: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  role: string | null;
  location: string | null;
  website: string | null;
  avatarUrl: string | null;
  notifyByEmail: boolean;
  notifyBySms: boolean;
};

/** Load a partner's own profile for the account page, or null if missing. */
export async function getPartnerProfile(
  organizationId: string,
  partnerId: string,
): Promise<PartnerProfile | null> {
  return prisma.partner.findFirst({
    where: { id: partnerId, organizationId },
    select: {
      fullName: true,
      email: true,
      phone: true,
      companyName: true,
      role: true,
      location: true,
      website: true,
      avatarUrl: true,
      notifyByEmail: true,
      notifyBySms: true,
    },
  });
}

/** Editable profile fields (empty optionals already normalized to null). Email is
 *  excluded (read-only) as is the commission rate (admin-only). */
export type PartnerProfileUpdateInput = {
  fullName: string;
  phone: string | null;
  companyName: string | null;
  role: string | null;
  location: string | null;
  website: string | null;
  notifyByEmail: boolean;
  notifyBySms: boolean;
};

/**
 * Update a partner's own profile. The `fullName` is mirrored onto the linked
 * `UserProfile` (the auth mirror) in the same transaction so the name stays
 * consistent between the partner domain and the account identity.
 */
export async function updatePartnerProfile(
  organizationId: string,
  partnerId: string,
  data: PartnerProfileUpdateInput,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const owned = await tx.partner.findFirst({
      where: { id: partnerId, organizationId },
      select: { id: true },
    });
    if (!owned) return;
    const updated = await tx.partner.update({
      where: { id: partnerId },
      data,
      select: { userId: true },
    });
    if (updated.userId) {
      await tx.userProfile.update({
        where: { id: updated.userId },
        data: { fullName: data.fullName },
      });
    }
  });
}

/**
 * Set (or clear, with `null`) a partner's profile picture URL. Mirrored onto the
 * linked `UserProfile.avatarUrl` (the auth mirror) in the same transaction so the
 * photo stays consistent between the partner domain and the account identity.
 * Old storage blobs are pruned by folder prefix by the caller, so no prior value
 * is returned here.
 */
export async function updatePartnerAvatar(
  organizationId: string,
  partnerId: string,
  avatarUrl: string | null,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const owned = await tx.partner.findFirst({
      where: { id: partnerId, organizationId },
      select: { id: true },
    });
    if (!owned) return;
    const updated = await tx.partner.update({
      where: { id: partnerId },
      data: { avatarUrl },
      select: { userId: true },
    });
    if (updated.userId) {
      await tx.userProfile.update({
        where: { id: updated.userId },
        data: { avatarUrl },
      });
    }
  });
}
