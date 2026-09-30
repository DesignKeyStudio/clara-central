/**
 * Demo dataset + org seeding — shared by `prisma/seed.ts` (Default org) and the
 * `/demo` server action (fresh demo orgs).
 *
 * Kept free of `@/` path-alias imports and of any Supabase/Next imports so the
 * Prisma seed can import it under `tsx` (which doesn't resolve tsconfig aliases).
 * Auth-user / session provisioning lives in the app-only server action, NOT here.
 *
 * The data is the prototype's demo set: 4 partners (one primary, richest), 9
 * referrals, 12 invoices, 2 payouts. Commission is per-partner (Diaz 12 / Shah 10
 * / Walsh 15), snapshotted onto each referral.
 */
import { prisma } from "../prisma";
import { newId, newReferralCode } from "../ids";

/** The primary partner (Jordan Diaz) — richest data; the one a `role=partner` demo logs in as. */
export const DEMO_PRIMARY_PARTNER_KEY = "p1";

type PartnerSeed = {
  key: string;
  fullName: string;
  email: string;
  phone?: string;
  companyName?: string;
  role?: string;
  location?: string;
  howDidYouHear?: string;
  typesOfReferrals?: string;
  status: "pending" | "approved" | "rejected";
  entryType: "invited" | "self_signup";
  createdAt: string;
  lastLoginAt?: string | null;
  rate: number;
};

const PARTNERS: PartnerSeed[] = [
  { key: "p1", fullName: "Jordan Diaz", email: "jordan@diazgroup.com", phone: "(512) 555-0148", companyName: "Diaz Group", role: "Managing Partner", location: "Austin, TX", howDidYouHear: "Referred by a current partner", typesOfReferrals: "Dental practices, medical clinics, and local service businesses needing full-service bookkeeping.", status: "approved", entryType: "self_signup", createdAt: "2026-01-08", lastLoginAt: "2026-06-02T14:18:00", rate: 12 },
  { key: "p2", fullName: "Priya Shah", email: "priya@shahco.com", phone: "(312) 555-0192", companyName: "Shah & Co Advisors", role: "Principal Advisor", location: "Chicago, IL", howDidYouHear: "LinkedIn", typesOfReferrals: "Real estate brokerages and property management firms.", status: "approved", entryType: "invited", createdAt: "2026-02-02", lastLoginAt: "2026-05-28T09:42:00", rate: 10 },
  { key: "p3", fullName: "Liam Walsh", email: "liam@walshadvisory.com", phone: "(720) 555-0110", companyName: "Walsh Advisory", role: "Founder", location: "Denver, CO", howDidYouHear: "Industry conference", typesOfReferrals: "Healthcare groups and multi-location clinics.", status: "approved", entryType: "invited", createdAt: "2026-02-20", lastLoginAt: "2026-06-03T08:05:00", rate: 15 },
  { key: "p4", fullName: "Nadia Okafor", email: "nadia@okaforllc.com", phone: "(305) 555-0173", companyName: "Okafor Consulting LLC", role: "Consultant", location: "Miami, FL", howDidYouHear: "Google search", typesOfReferrals: "Hospitality businesses, restaurants and boutique retailers.", status: "pending", entryType: "self_signup", createdAt: "2026-05-24", lastLoginAt: null, rate: 10 },
];

type ReferralSeed = {
  key: string;
  partner: string;
  contactName: string;
  contactEmail?: string | null;
  contactCompany?: string | null;
  notes: string;
  status: "submitted" | "contacted" | "meeting_scheduled" | "proposal_sent" | "negotiating" | "deal_closed" | "no_response" | "not_qualified" | "lost";
  createdAt: string;
  contractEndedAt?: string | null;
};

const REFERRALS: ReferralSeed[] = [
  { key: "r1", partner: "p1", contactName: "Dr. Helen Park", contactEmail: "helen@westsidedental.co", contactCompany: "Westside Dental Co.", notes: "Met at the regional SMB expo. Needs full bookkeeping plus payroll for a 14-person practice. Warm intro already made — very likely to close.", status: "deal_closed", createdAt: "2026-04-02" },
  { key: "r2", partner: "p2", contactName: "Marcus Lee", contactEmail: "marcus@leecorealty.com", contactCompany: "Lee & Co Realty", notes: "Brokerage with 30+ agents. Currently negotiating scope and monthly retainer.", status: "negotiating", createdAt: "2026-04-09" },
  { key: "r3", partner: "p3", contactName: "Brightpath Clinic", contactEmail: "ops@brightpathhealth.com", contactCompany: "Brightpath Health", notes: "Multi-location clinic group. Proposal sent for bookkeeping + monthly reporting across 3 sites.", status: "proposal_sent", createdAt: "2026-04-14" },
  { key: "r4", partner: "p1", contactName: "Tara Nguyen", contactEmail: "tara@nguyenbakery.com", contactCompany: "Nguyen Bakery", notes: "Small bakery, owner wants to move off spreadsheets. First call done.", status: "contacted", createdAt: "2026-04-21" },
  { key: "r5", partner: "p2", contactName: "Orion Logistics", contactEmail: "finance@orionlogistics.com", contactCompany: "Orion Logistics LLC", notes: "Regional freight company. Closed — onboarding for full bookkeeping retainer.", status: "deal_closed", createdAt: "2026-03-18", contractEndedAt: "2026-05-20" },
  { key: "r6", partner: "p3", contactName: "Sam Porter", contactEmail: null, contactCompany: null, notes: "Independent contractor. Sent intro email, no reply after two follow-ups.", status: "no_response", createdAt: "2026-03-30" },
  { key: "r7", partner: "p1", contactName: "Ana Reyes", contactEmail: "ana@cedarpinecafe.com", contactCompany: "Cedar & Pine Cafe", notes: "Two-location cafe. Discovery meeting scheduled for next week.", status: "meeting_scheduled", createdAt: "2026-05-06" },
  { key: "r8", partner: "p2", contactName: "Devon Brooks", contactEmail: "devon@halcyonstudios.com", contactCompany: "Halcyon Studios", notes: "Creative studio, just submitted. Needs qualification call.", status: "submitted", createdAt: "2026-05-12" },
  { key: "r9", partner: "p2", contactName: "Lakeside Property Mgmt", contactEmail: "admin@lakesidepm.com", contactCompany: "Lakeside PM", notes: "Closed early last year — full bookkeeping retainer. Commission window has now lapsed.", status: "deal_closed", createdAt: "2025-03-10" },
];

type InvoiceSeed = {
  number: string;
  referral: string;
  partner: string;
  amount: number;
  status: "draft" | "sent" | "paid";
  issuedDate: string;
  paidDate?: string | null;
  publicNote?: string;
  privateNote?: string;
};

const INVOICES: InvoiceSeed[] = [
  { number: "INV-1990", referral: "r9", partner: "p2", amount: 5000, status: "paid", issuedDate: "2025-03-20", paidDate: "2025-03-31" },
  { number: "INV-2041", referral: "r1", partner: "p1", amount: 4500, status: "paid", issuedDate: "2026-03-28", paidDate: "2026-04-05", publicNote: "First month — setup + March bookkeeping. Thanks for the warm intro!", privateNote: "Client paid promptly via ACH. Good lead, prioritize similar." },
  { number: "INV-2042", referral: "r1", partner: "p1", amount: 3000, status: "sent", issuedDate: "2026-04-12", paidDate: null, publicNote: "April retainer — payroll add-on included." },
  { number: "INV-2091", referral: "r1", partner: "p1", amount: 2750, status: "paid", issuedDate: "2026-04-20", paidDate: "2026-04-28" },
  { number: "INV-2051", referral: "r5", partner: "p2", amount: 8400, status: "paid", issuedDate: "2026-03-22", paidDate: "2026-03-30" },
  { number: "INV-2052", referral: "r5", partner: "p2", amount: 2400, status: "paid", issuedDate: "2026-04-02", paidDate: "2026-04-09" },
  { number: "INV-2101", referral: "r5", partner: "p2", amount: 3300, status: "sent", issuedDate: "2026-04-05", paidDate: null },
  { number: "INV-2071", referral: "r2", partner: "p2", amount: 5200, status: "sent", issuedDate: "2026-04-22", paidDate: null },
  { number: "INV-2061", referral: "r3", partner: "p3", amount: 8500, status: "sent", issuedDate: "2026-04-16", paidDate: null },
  { number: "INV-2062", referral: "r3", partner: "p3", amount: 12000, status: "paid", issuedDate: "2026-02-28", paidDate: "2026-03-14" },
  { number: "INV-2111", referral: "r3", partner: "p3", amount: 9800, status: "paid", issuedDate: "2026-03-05", paidDate: "2026-03-20" },
  { number: "INV-2081", referral: "r7", partner: "p1", amount: 6000, status: "sent", issuedDate: "2026-05-10", paidDate: null },
];

type PayoutSeed = {
  referral: string;
  partner: string;
  amount: number;
  publicNote: string;
  privateNote: string;
  createdAt: string;
};

const PAYOUTS: PayoutSeed[] = [
  { referral: "r1", partner: "p1", amount: 870, publicNote: "Q2 2026 commission payment", privateNote: "Wire transfer ref #WT-4421", createdAt: "2026-05-01" },
  { referral: "r5", partner: "p2", amount: 1080, publicNote: "Commission for Orion Logistics close", privateNote: "ACH batch payment", createdAt: "2026-05-03" },
];

export type SeedOrgResult = {
  /** The primary partner's id in this org (Jordan) — link a `role=partner` demo user to it. */
  primaryPartnerId: string;
  primaryPartner: { email: string; fullName: string };
};

/**
 * Insert the full demo dataset into `organizationId` (batched). Partner + referral
 * ids are pre-generated so relations wire up in a single `createMany` per table;
 * invoice/payout ids are auto-assigned by the Prisma client extension.
 */
export async function seedOrgData(organizationId: string): Promise<SeedOrgResult> {
  const partnerId: Record<string, string> = Object.fromEntries(
    PARTNERS.map((p) => [p.key, newId("partner")]),
  );
  const referralId: Record<string, string> = Object.fromEntries(
    REFERRALS.map((r) => [r.key, newId("ref")]),
  );
  const rateByKey = Object.fromEntries(PARTNERS.map((p) => [p.key, p.rate]));

  await prisma.partner.createMany({
    data: PARTNERS.map((p) => ({
      id: partnerId[p.key],
      organizationId,
      fullName: p.fullName,
      email: p.email,
      phone: p.phone ?? null,
      companyName: p.companyName ?? null,
      role: p.role ?? null,
      location: p.location ?? null,
      howDidYouHear: p.howDidYouHear ?? null,
      typesOfReferrals: p.typesOfReferrals ?? null,
      status: p.status,
      entryType: p.entryType,
      commissionRate: p.rate,
      referralCode: newReferralCode(p.fullName),
      createdAt: new Date(p.createdAt),
      lastLoginAt: p.lastLoginAt ? new Date(p.lastLoginAt) : null,
    })),
  });

  await prisma.referral.createMany({
    data: REFERRALS.map((r) => ({
      id: referralId[r.key],
      organizationId,
      partnerId: partnerId[r.partner],
      contactName: r.contactName,
      contactEmail: r.contactEmail ?? null,
      contactCompany: r.contactCompany ?? null,
      notes: r.notes,
      status: r.status,
      commissionRate: rateByKey[r.partner] ?? 10,
      createdAt: new Date(r.createdAt),
      contractEndedAt: r.contractEndedAt ? new Date(r.contractEndedAt) : null,
    })),
  });

  await prisma.invoice.createMany({
    data: INVOICES.map((i) => ({
      organizationId,
      number: i.number,
      referralId: referralId[i.referral],
      partnerId: partnerId[i.partner],
      amount: i.amount,
      status: i.status,
      issuedDate: new Date(i.issuedDate),
      paidDate: i.paidDate ? new Date(i.paidDate) : null,
      publicNote: i.publicNote ?? null,
      privateNote: i.privateNote ?? null,
    })),
  });

  await prisma.payout.createMany({
    data: PAYOUTS.map((p) => ({
      organizationId,
      partnerId: partnerId[p.partner],
      referralId: referralId[p.referral],
      amount: p.amount,
      publicNote: p.publicNote,
      privateNote: p.privateNote,
      createdAt: new Date(p.createdAt),
    })),
  });

  const primary = PARTNERS.find((p) => p.key === DEMO_PRIMARY_PARTNER_KEY)!;
  return {
    primaryPartnerId: partnerId[DEMO_PRIMARY_PARTNER_KEY],
    primaryPartner: { email: primary.email, fullName: primary.fullName },
  };
}

/** Number of live demo orgs — the global cap check for `/demo`. */
export function liveDemoOrgCount(): Promise<number> {
  return prisma.organization.count({ where: { isDemo: true } });
}

/**
 * The partner a `role=partner` demo should log in as: the org's oldest approved
 * partner (the primary, Jordan — richest data). Used on reuse when the org exists
 * but its partner principal wasn't provisioned yet.
 */
export async function findDemoPrimaryPartnerId(organizationId: string): Promise<string | null> {
  const p = await prisma.partner.findFirst({
    where: { organizationId, status: "approved" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return p?.id ?? null;
}
