/**
 * One-off: create/ensure a second admin (email + password login, role=admin).
 * Run: pnpm exec tsx scripts/create-admin.ts
 *
 * Mirrors prisma/seed.ts seedAdmin(): (1) Supabase auth user with
 * app_metadata.role=admin, (2) matching UserProfile row. Re-runnable.
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

import { prisma } from "../src/lib/prisma";

// Configure via env so no credentials live in the repo:
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='…' pnpm exec tsx scripts/create-admin.ts
const EMAIL = process.env.ADMIN_EMAIL ?? "admin@example.com";
const PASSWORD = process.env.ADMIN_PASSWORD;
const FULL_NAME = process.env.ADMIN_FULL_NAME ?? "Admin User";

if (!PASSWORD) {
  throw new Error("Set ADMIN_PASSWORD (and optionally ADMIN_EMAIL / ADMIN_FULL_NAME) before running this script.");
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

async function main() {
  const supabase = getSupabaseAdmin();

  // Create the auth user (or update it if it already exists).
  const { data, error } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    app_metadata: { role: "admin" },
    user_metadata: { full_name: FULL_NAME },
  });

  let userId = data?.user?.id;

  if (error && !/already.*(registered|exists)/i.test(error.message)) {
    throw new Error(`Failed to create ${EMAIL}: ${error.message}`);
  }

  if (error || !userId) {
    // Already exists — look it up and ensure role + password.
    const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) throw new Error(`Lookup failed: ${listErr.message}`);
    const existing = list.users.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase());
    if (!existing) throw new Error(`Could not resolve existing auth user for ${EMAIL}`);
    userId = existing.id;
    await supabase.auth.admin.updateUserById(userId, {
      password: PASSWORD,
      email_confirm: true,
      app_metadata: { role: "admin" },
      user_metadata: { full_name: FULL_NAME },
    });
  }

  await prisma.userProfile.upsert({
    where: { id: userId },
    update: { email: EMAIL, fullName: FULL_NAME, role: "admin", isActive: true },
    create: { id: userId, email: EMAIL, fullName: FULL_NAME, role: "admin" },
  });

  console.log(`  ✓ Admin ready: ${EMAIL} (id: ${userId})`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
