import type { SupabaseClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

/**
 * Outcome of provisioning a partner's Supabase auth user.
 * - `{ userId }`      — a NEW auth user was created, OR an orphaned one reclaimed.
 * - `{ conflict: true }` — the email belongs to a REAL, linked account (a genuine
 *                          duplicate). The caller surfaces its own "already exists"
 *                          message.
 */
export type ProvisionAuthResult = { userId: string } | { conflict: true };

/** The Supabase auth user id for `email`, or null. Reads `auth.users` directly. */
async function authUserIdByEmail(email: string): Promise<string | null> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id::text AS id FROM auth.users WHERE lower(email) = ${email.toLowerCase()} LIMIT 1`;
  return rows[0]?.id ?? null;
}

/**
 * Create the Supabase auth user for a partner (role `partner`, OTP-only), or
 * RECLAIM an orphaned one.
 *
 * An *orphan* is an `auth.users` row that no `UserProfile`/`Partner.userId`
 * references — left behind when a reseed (or a partial provisioning failure)
 * wiped the domain tables without deleting the auth user. Supabase rejects a
 * re-`createUser` for that email with `email_exists`, so without reclaiming, the
 * email would dead-end forever ("an account already exists") even though no real
 * account exists. This bridges Supabase Auth (the injected `admin` client) and
 * our Prisma domain to tell the two apart.
 *
 * Returns `{ userId }` for a created OR reclaimed user (caller proceeds exactly the
 * same in both cases), or `{ conflict: true }` when the email is already linked to
 * a live account (caller blocks).
 */
export async function provisionPartnerAuthUser(
  admin: SupabaseClient,
  { email, fullName }: { email: string; fullName: string },
): Promise<ProvisionAuthResult> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    app_metadata: { role: "partner" },
    user_metadata: { full_name: fullName },
  });
  if (data?.user) return { userId: data.user.id };

  // Only an email collision is recoverable; any other failure blocks.
  if (error?.code !== "email_exists") return { conflict: true };

  const existingId = await authUserIdByEmail(email);
  if (!existingId) return { conflict: true }; // raced away between the two calls

  // Reclaimable only if NOTHING in our domain references this auth user. If a
  // profile or a linked partner points at it, it's a genuine, live account.
  const [profile, linkedPartner] = await Promise.all([
    prisma.userProfile.findUnique({ where: { id: existingId }, select: { id: true } }),
    prisma.partner.findFirst({ where: { userId: existingId }, select: { id: true } }),
  ]);
  if (profile || linkedPartner) return { conflict: true };

  // Orphan → adopt it: refresh its metadata so it logs in as this partner, then
  // hand its id back as if freshly created.
  await admin.auth.admin
    .updateUserById(existingId, {
      email_confirm: true,
      app_metadata: { role: "partner" },
      user_metadata: { full_name: fullName },
    })
    .catch(() => {});

  return { userId: existingId };
}
