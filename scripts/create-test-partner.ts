/**
 * One-off: create an APPROVED partner with a real Supabase auth user (OTP login),
 * a UserProfile, and a linked Partner row — mirroring prisma/seed.ts. Safe to
 * re-run: it reclaims an existing auth user / upserts the profile / links the row.
 *
 * Run: pnpm exec tsx scripts/create-test-partner.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { prisma } from "../src/lib/prisma";
import { newReferralCode } from "../src/lib/ids";
import { ORG_DEFAULT_ID } from "../src/lib/organization";

// Configure via env: PARTNER_EMAIL=you@example.com pnpm exec tsx scripts/create-test-partner.ts
const EMAIL = process.env.PARTNER_EMAIL ?? "test.partner@example.com";
const FULL_NAME = process.env.PARTNER_FULL_NAME ?? "Test Partner";
const COMPANY_NAME = process.env.PARTNER_COMPANY ?? "Example Co";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function authUserIdByEmail(email: string): Promise<string | null> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id::text AS id FROM auth.users WHERE lower(email) = ${email.toLowerCase()} LIMIT 1`;
  return rows[0]?.id ?? null;
}

async function main() {
  const supabase = admin();
  const email = EMAIL.toLowerCase();

  // 1) Auth user (role=partner, email confirmed, OTP-only — no password).
  let userId: string;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    app_metadata: { role: "partner" },
    user_metadata: { full_name: FULL_NAME },
  });
  if (data?.user) {
    userId = data.user.id;
    console.log(`Created auth user ${userId}`);
  } else if (error?.code === "email_exists") {
    const existing = await authUserIdByEmail(email);
    if (!existing) throw new Error("email_exists but no auth row found");
    userId = existing;
    await supabase.auth.admin.updateUserById(userId, {
      email_confirm: true,
      app_metadata: { role: "partner" },
      user_metadata: { full_name: FULL_NAME },
    });
    console.log(`Reused existing auth user ${userId}`);
  } else {
    throw new Error(`createUser failed: ${error?.message}`);
  }

  // 2) UserProfile (id = auth.users.id) + membership in the Default org.
  await prisma.userProfile.upsert({
    where: { id: userId },
    update: { email, fullName: FULL_NAME, role: "partner", isActive: true },
    create: { id: userId, email, fullName: FULL_NAME, role: "partner" },
  });
  await prisma.organizationMembership.upsert({
    where: { userId_organizationId: { userId, organizationId: ORG_DEFAULT_ID } },
    update: {},
    create: { userId, organizationId: ORG_DEFAULT_ID },
  });

  // 3) Partner row (approved, linked) in the Default org. Upsert by the per-org
  //    email unique.
  const partner = await prisma.partner.upsert({
    where: { organizationId_email: { organizationId: ORG_DEFAULT_ID, email } },
    update: { userId, status: "approved", fullName: FULL_NAME },
    create: {
      organizationId: ORG_DEFAULT_ID,
      email,
      fullName: FULL_NAME,
      userId,
      status: "approved",
      entryType: "invited",
      referralCode: newReferralCode(FULL_NAME),
      companyName: COMPANY_NAME,
    },
  });

  console.log(`Partner ready: ${partner.email} (id=${partner.id}, status=${partner.status})`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
