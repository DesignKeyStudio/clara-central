import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Demo cleanup — reap `isDemo` orgs idle past the retention window.
 *
 * Triggered daily by Vercel Cron (see vercel.json), authenticated with
 * `CRON_SECRET` (Vercel sends it as `Authorization: Bearer <secret>`).
 *
 * Per reaped org: collect its members' auth-user ids, delete the org (cascade
 * removes memberships / partners / referrals / invoices / payouts / appConfig),
 * then delete the demo users' GLOBAL rows — `UserProfile` (not org-scoped, so the
 * cascade misses it) and the Supabase `auth.users` entry (admin API). The Default
 * org is never `isDemo`, so it's structurally excluded.
 */
export const dynamic = "force-dynamic";

const RETENTION_DAYS = 30;
const MAX_PER_RUN = 200; // bound a single run; daily cadence catches the rest

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const stale = await prisma.organization.findMany({
    where: { isDemo: true, lastActiveAt: { lt: cutoff } },
    select: { id: true, memberships: { select: { userId: true } } },
    take: MAX_PER_RUN,
  });

  const admin = createAdminClient();
  let orgsDeleted = 0;
  let usersDeleted = 0;

  for (const org of stale) {
    const userIds = org.memberships.map((m) => m.userId);
    // Cascade clears all org-scoped rows (incl. memberships).
    await prisma.organization.delete({ where: { id: org.id } });
    // UserProfile is global (no organizationId) — remove the demo profiles explicitly.
    if (userIds.length) {
      await prisma.userProfile.deleteMany({ where: { id: { in: userIds } } });
    }
    // Best-effort: drop the Supabase auth users (external; never blocks the reap).
    for (const userId of userIds) {
      await admin.auth.admin.deleteUser(userId).catch(() => {});
      usersDeleted += 1;
    }
    orgsDeleted += 1;
  }

  return NextResponse.json({
    ok: true,
    retentionDays: RETENTION_DAYS,
    cutoff: cutoff.toISOString(),
    orgsDeleted,
    usersDeleted,
    remaining: stale.length === MAX_PER_RUN ? "more may remain (capped this run)" : "none",
  });
}
