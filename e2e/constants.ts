/**
 * Test accounts + known seed data the E2E suite asserts against.
 *
 * These mirror `prisma/seed.ts`. If your seed uses different values, override
 * via env (E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, E2E_PARTNER_EMAIL) rather than
 * editing this file. The figures below assume a freshly seeded DB and the
 * mid-2026 clock the seed is built around (see e2e/TEST-PLAN.md §1).
 */

/** Seeded admin — signs in with email + password (role=admin). */
export const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL ?? "admin@example.com",
  password: process.env.E2E_ADMIN_PASSWORD ?? "AdminPass123!",
};

/**
 * Seeded partner — the ONE approved partner wired to a real Supabase auth user
 * (Jordan Diaz / p1), so the OTP login flow is testable. Signs in via OTP
 * (the code is mocked server-side — any 6 digits are accepted).
 *
 * Jordan is fully paid (owed $0), so his "Record payout" button is disabled —
 * the mutating payout flow uses PARTNER_OWED (Liam) instead.
 */
export const PARTNER = {
  email: process.env.E2E_PARTNER_EMAIL ?? "jordan@diazgroup.com",
  fullName: "Jordan Diaz",
  rate: "12%",
  referralCount: "3",
  commissionEarned: "$870",
  commissionPaid: "$870",
  commissionOwed: "$0",
  /** Jordan's three referral contacts (and nobody else's). */
  referrals: ["Dr. Helen Park", "Tara Nguyen", "Ana Reyes"] as const,
};

/** A referral contact that belongs to PARTNER above (see prisma/seed.ts: r1). */
export const PARTNER_REFERRAL_CONTACT = "Dr. Helen Park";

/** A referral contact belonging to a DIFFERENT partner — admin sees it, partner does not. */
export const OTHER_REFERRAL_CONTACT = "Marcus Lee";

/**
 * A second approved partner with OUTSTANDING commission. Used by the mutating
 * record-payout test (Jordan is fully paid, so his payout button is disabled).
 */
export const PARTNER_OWED = {
  fullName: "Liam Walsh",
  rate: "15%",
  referralCount: "2",
  commissionEarned: "$3,270",
  commissionPaid: "$0",
  commissionOwed: "$3,270",
};

/** The seeded PENDING self-signup partner — used by the approve/reject test. */
export const PARTNER_PENDING = { fullName: "Nadia Okafor" };

/**
 * Referral contacts the specs navigate to, keyed by commission-window state —
 * the trio that proves the window rule (open accrues, expired/ended don't gate
 * already-earned commission). See e2e/TEST-PLAN.md §F and prisma/seed.ts.
 */
export const REFERRALS = {
  /** r1 — window OPEN; commission still accrues. */
  active: { name: "Dr. Helen Park", commissionEarned: "$870", invoices: "3" },
  /** r5 — contract ENDED early; gates new invoices but keeps earned commission. */
  ended: { name: "Orion Logistics", commissionEarned: "$1,080" },
  /** r9 — window EXPIRED; its one historical paid invoice still counts. */
  expired: { name: "Lakeside Property Mgmt", commissionEarned: "$500", invoices: "1" },
  /** r3 — Liam's referral with $3,270 owed; used by the record-payment test. */
  owed: { name: "Brightpath Clinic", owed: "$3,270" },
};

/** Admin partners-list KPI values on a fresh seed. */
export const PARTNERS_LIST = {
  total: "4",
  approved: "3",
  pending: "1",
  totalCommissionPaid: "$1,950",
};

/** Admin payouts-list values on a fresh seed. */
export const PAYOUTS_LIST = { totalPaidOut: "$1,950" };

/**
 * A payout's ADMIN-ONLY private note. Must be visible on the admin payouts page
 * but NEVER on the partner payouts page — the key data-confidentiality check.
 */
export const PRIVATE_PAYOUT_NOTE = "Wire transfer ref #WT-4421";

/**
 * Seeded values shown on the account-profile pages (mirror prisma/seed.ts).
 * Email is read-only on both pages (login identity); the partner page also
 * carries company/role/location/website + notification prefs (Email on, SMS off
 * by default), the admin page only name + phone.
 */
export const PARTNER_PROFILE = {
  email: PARTNER.email,
  fullName: PARTNER.fullName, // "Jordan Diaz"
  phone: "(512) 555-0148",
  company: "Diaz Group",
  role: "Managing Partner",
  location: "Austin, TX",
};

export const ADMIN_PROFILE = {
  email: ADMIN.email,
  fullName: "Admin User",
};

/** Storage-state files written by auth.setup.ts (gitignored). */
export const ADMIN_STATE = "e2e/.auth/admin.json";
export const PARTNER_STATE = "e2e/.auth/partner.json";
