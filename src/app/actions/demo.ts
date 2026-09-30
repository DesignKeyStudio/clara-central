"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { user_role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createOrganization } from "@/lib/services/organization-service";
import {
  seedOrgData,
  liveDemoOrgCount,
  findDemoPrimaryPartnerId,
} from "@/lib/services/demo-service";

// ── Config ──

/** Domain for generated demo login emails (never receives mail — email_confirm). */
const DEMO_EMAIL_DOMAIN = "demo.claracentral.app";
/** Global backstop: refuse spinning up a NEW org past this many live demos (reuse still works). */
const DEMO_ORG_CAP = 500;
const DEMO_COOKIE = "cb_demo";
const DEMO_COOKIE_MAX_AGE_S = 60 * 60 * 24 * 30; // 30 days

export type DemoRole = Extract<user_role, "admin" | "partner">;
export type StartDemoResult = { error: string }; // success path redirects (returns nothing)

/** Marks a visitor's demo across visits so a re-open reuses their (un-cleaned) org. */
type DemoCookie = { orgId: string; admin?: string; partner?: string };

function readCookie(raw: string | undefined): DemoCookie | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return v && typeof v.orgId === "string" ? (v as DemoCookie) : null;
  } catch {
    return null;
  }
}

/**
 * Provision a demo principal (auth user + profile + membership) for `role` in
 * `orgId`. For a partner, link them to the org's primary seeded partner so the
 * portal is populated. Returns the auth user's id + email.
 */
async function provisionPrincipal(
  orgId: string,
  role: DemoRole,
): Promise<{ userId: string; email: string }> {
  const admin = createAdminClient();
  const email = `demo-${crypto.randomUUID()}@${DEMO_EMAIL_DOMAIN}`;

  let displayName = role === "admin" ? "Demo Admin" : "Demo Partner";
  let linkPartnerId: string | null = null;
  if (role === "partner") {
    linkPartnerId = await findDemoPrimaryPartnerId(orgId);
    if (linkPartnerId) {
      const p = await prisma.partner.findUnique({
        where: { id: linkPartnerId },
        select: { fullName: true },
      });
      if (p) displayName = p.fullName;
    }
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    app_metadata: { role },
    user_metadata: { full_name: displayName },
  });
  if (error || !data?.user) {
    throw new Error(`Could not create demo user: ${error?.message ?? "unknown"}`);
  }
  const userId = data.user.id;

  await prisma.userProfile.create({
    data: { id: userId, email, fullName: displayName, role },
  });
  await prisma.organizationMembership.create({ data: { userId, organizationId: orgId } });
  if (role === "partner" && linkPartnerId) {
    await prisma.partner.update({ where: { id: linkPartnerId }, data: { userId } });
  }

  return { userId, email };
}

/** Plant an SSR cookie session for `email` (admin-generated OTP, no mail sent). */
async function plantSession(email: string): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const otp = data?.properties?.email_otp;
  if (error || !otp) throw new Error(`Could not start the demo session: ${error?.message ?? "no otp"}`);
  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
  if (verifyError) throw new Error(`Could not sign in to the demo: ${verifyError.message}`);
}

/**
 * Spin up (or reuse) a demo org for the visitor and sign them in.
 *
 * - Cookie present + org still live: reuse it — ensure a principal exists for the
 *   requested role (provision one in the SAME org if not), touch lastActiveAt, and
 *   re-mint that principal's session.
 * - Otherwise: enforce the global cap, create a fresh isDemo org, seed it, provision
 *   the role principal, and set the reuse cookie.
 *
 * Returns `{ error }` on failure; on success it redirects into the panel.
 */
export async function startDemoAction(role: DemoRole): Promise<StartDemoResult | void> {
  const jar = await cookies();
  const existing = readCookie(jar.get(DEMO_COOKIE)?.value);

  let orgId: string | null = null;
  let state: DemoCookie | null = null;

  if (existing) {
    const org = await prisma.organization.findFirst({
      where: { id: existing.orgId, isDemo: true },
      select: { id: true },
    });
    if (org) {
      orgId = org.id;
      state = existing;
    }
  }

  try {
    if (orgId && state) {
      // Reuse: keep the org, ensure a principal for this role.
      let email: string;
      const knownUserId = state[role];
      if (knownUserId) {
        const profile = await prisma.userProfile.findUnique({
          where: { id: knownUserId },
          select: { email: true },
        });
        if (!profile) throw new Error("demo user missing"); // fall through to catch → fresh
        email = profile.email;
      } else {
        const p = await provisionPrincipal(orgId, role);
        state[role] = p.userId;
        email = p.email;
      }
      await prisma.organization.update({ where: { id: orgId }, data: { lastActiveAt: new Date() } });
      await plantSession(email);
    } else {
      // Fresh: cap check, then create + seed + provision.
      if ((await liveDemoOrgCount()) >= DEMO_ORG_CAP) {
        return { error: "The demo is at capacity right now. Please try again later." };
      }
      const org = await createOrganization({ name: "Demo", isDemo: true });
      await seedOrgData(org.id);
      const p = await provisionPrincipal(org.id, role);
      state = { orgId: org.id, [role]: p.userId };
      await plantSession(p.email);
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not start the demo." };
  }

  jar.set(DEMO_COOKIE, JSON.stringify(state), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEMO_COOKIE_MAX_AGE_S,
  });

  redirect(role === "admin" ? "/admin" : "/partner");
}
