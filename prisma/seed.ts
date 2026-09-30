/**
 * Prisma seed — provisions the Default org's demo data + login accounts.
 * Run: pnpm exec prisma db seed
 *
 * The domain dataset + insert logic live in `src/lib/services/demo-service.ts`
 * (shared with the /demo feature, which seeds fresh demo orgs the same way). This
 * script owns only what's Default-org-specific: the fixed admin/partner Supabase
 * auth users + their memberships. Re-runnable: clears the Default org's domain
 * tables, then reseeds.
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local for Supabase service-role key (Prisma CLI loads prisma/.env for DATABASE_URL).
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

import { prisma } from "../src/lib/prisma";
import { ORG_DEFAULT_ID, ORG_DEFAULT_NAME } from "../src/lib/organization";
import { seedOrgData } from "../src/lib/services/demo-service";

// ── Admin ──

const ADMIN_USER_ID = "00000000-0000-0000-0000-000000000010";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";

// Local-development default. It is published in this repo's README, so treat it
// as public knowledge: never seed a shared or internet-reachable database with
// it. Override per environment with SEED_ADMIN_PASSWORD.
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "AdminPass123!";

// The primary seeded partner gets a real Supabase auth user so partner OTP login
// is testable. Fixed id (like the admin) so reseeds re-link the same auth user.
const PARTNER_LOGIN_USER_ID = "00000000-0000-0000-0000-000000000020";

function log(msg: string) {
  console.log(`  ✓ ${msg}`);
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — set in .env.local");
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ── Seed steps ──

/**
 * The Default organization — every seeded row lives here (the real, non-demo
 * tenant). Idempotent; also ensures its per-org AppConfig row exists.
 */
async function seedOrganization() {
  await prisma.organization.upsert({
    where: { id: ORG_DEFAULT_ID },
    update: { name: ORG_DEFAULT_NAME, isDemo: false },
    create: { id: ORG_DEFAULT_ID, name: ORG_DEFAULT_NAME, isDemo: false },
  });
  log(`Organization: ${ORG_DEFAULT_NAME} (${ORG_DEFAULT_ID})`);
}

/** Link a user to the Default org (idempotent on the userId+org unique). */
async function ensureMembership(userId: string) {
  await prisma.organizationMembership.upsert({
    where: { userId_organizationId: { userId, organizationId: ORG_DEFAULT_ID } },
    update: {},
    create: { userId, organizationId: ORG_DEFAULT_ID },
  });
}

async function seedAdmin() {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.auth.admin.createUser({
    id: ADMIN_USER_ID,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    app_metadata: { role: "admin" },
    user_metadata: { full_name: "Admin User" },
  });
  if (error && !/already.*(registered|exists)/i.test(error.message)) {
    console.error(`  ✗ Failed to create ${ADMIN_EMAIL}:`, error.message);
  } else if (error) {
    await supabase.auth.admin.updateUserById(ADMIN_USER_ID, {
      password: ADMIN_PASSWORD,
      app_metadata: { role: "admin" },
    });
  }

  await prisma.userProfile.upsert({
    where: { id: ADMIN_USER_ID },
    update: { email: ADMIN_EMAIL, fullName: "Admin User", role: "admin" },
    create: { id: ADMIN_USER_ID, email: ADMIN_EMAIL, fullName: "Admin User", role: "admin" },
  });
  await ensureMembership(ADMIN_USER_ID);
  log(`Admin: ${ADMIN_EMAIL}`);
}

/**
 * Give the primary seeded partner a real Supabase auth user (role=partner) and a
 * UserProfile (Partner.userId FK references user_profiles.id), then link it.
 * No password — partners sign in via OTP.
 */
async function seedPartnerLogin(partner: { id: string; email: string; fullName: string }) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.auth.admin.createUser({
    id: PARTNER_LOGIN_USER_ID,
    email: partner.email,
    email_confirm: true,
    app_metadata: { role: "partner" },
    user_metadata: { full_name: partner.fullName },
  });
  if (error && !/already.*(registered|exists)/i.test(error.message)) {
    console.error(`  ✗ Failed to create partner login ${partner.email}:`, error.message);
  } else if (error) {
    await supabase.auth.admin.updateUserById(PARTNER_LOGIN_USER_ID, {
      app_metadata: { role: "partner" },
    });
  }

  await prisma.userProfile.upsert({
    where: { id: PARTNER_LOGIN_USER_ID },
    update: { email: partner.email, fullName: partner.fullName, role: "partner" },
    create: { id: PARTNER_LOGIN_USER_ID, email: partner.email, fullName: partner.fullName, role: "partner" },
  });
  await ensureMembership(PARTNER_LOGIN_USER_ID);

  await prisma.partner.update({
    where: { id: partner.id },
    data: { userId: PARTNER_LOGIN_USER_ID },
  });
  log(`Partner login: ${partner.email} (OTP — any 6-digit code)`);
}

async function seedConfig() {
  await prisma.appConfig.upsert({
    where: { organizationId: ORG_DEFAULT_ID },
    update: { standardCommissionRate: 10, commissionValidMonths: 12 },
    create: { organizationId: ORG_DEFAULT_ID, standardCommissionRate: 10, commissionValidMonths: 12 },
  });
  log("AppConfig: standard rate 10%, window 12 months");
}

async function clearDomain() {
  // Scoped to the Default org so a reseed never wipes demo orgs created by the
  // /demo feature. (Their cleanup is a separate, isDemo-gated job.)
  const org = { organizationId: ORG_DEFAULT_ID };
  await prisma.payout.deleteMany({ where: org });
  await prisma.invoice.deleteMany({ where: org });
  await prisma.partnerInvite.deleteMany({ where: org });
  await prisma.referral.deleteMany({ where: org });
  await prisma.partner.deleteMany({ where: org });
  // Marketing sections/items are user-managed content (real uploads), NOT demo
  // data — the seed intentionally leaves them untouched so reseeds don't wipe them.
}

/** Seed the Default org's domain data (shared seeder) + link the partner login. */
async function seedDomain(): Promise<{ partnerEmail: string }> {
  const { primaryPartnerId, primaryPartner } = await seedOrgData(ORG_DEFAULT_ID);
  await seedPartnerLogin({
    id: primaryPartnerId,
    email: primaryPartner.email,
    fullName: primaryPartner.fullName,
  });
  log("Domain data: partners, referrals, invoices, payouts");
  return { partnerEmail: primaryPartner.email };
}

// ── Main ──

async function main() {
  console.log("\nSeeding Clara Central...\n");

  await seedOrganization();
  await seedAdmin();
  await seedConfig();
  await clearDomain();
  const { partnerEmail } = await seedDomain();

  console.log("\nSeed complete!\n");
  console.log("Admin account (password):");
  console.log(`  ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log("Partner account (OTP — any 6-digit code):");
  console.log(`  ${partnerEmail}`);
  console.log("");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
