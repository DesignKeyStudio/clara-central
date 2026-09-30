/**
 * Notification dispatch — org scoping + demo suppression (real DB, mocked transport).
 *
 * Two regressions this locks down:
 *  1. Admin alerts must fan out ONLY to admins of the org where the event happened
 *     (admins are tied to an org via OrganizationMembership; role is global).
 *  2. A demo (`isDemo`) org must never send real email/SMS — the sandbox is silent.
 *
 * The Resend transport (`@/lib/email`) is mocked so we can assert exactly who
 * would have been emailed without touching the network. Org/admin setup is real DB.
 *
 * Requires DATABASE_URL — skipped when absent. Self-cleaning. Run: pnpm test
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the email transport BEFORE importing the dispatcher (hoisted by vitest).
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { createOrganization } from "@/lib/services/organization-service";
import { notifyAdminNewReferral, notifyPartnerInvited } from "@/lib/notifications";

const HAS_DB = Boolean(process.env.DATABASE_URL);
const d = HAS_DB ? describe : describe.skip;

const ORG_A = "org_test_notify_a";
const ORG_B = "org_test_notify_b";
const ORG_DEMO = "org_test_notify_demo";

const ADMIN_A = { id: crypto.randomUUID(), email: "notify-admin-a@example.test" };
const ADMIN_B = { id: crypto.randomUUID(), email: "notify-admin-b@example.test" };
const ADMIN_DEMO = { id: crypto.randomUUID(), email: "notify-admin-demo@example.test" };

const sendEmailMock = vi.mocked(sendEmail);

async function destroyOrg(orgId: string) {
  await prisma.organization.deleteMany({ where: { id: orgId } });
}

/** Create an active admin UserProfile with a single membership to `orgId`. */
async function seedAdmin(user: { id: string; email: string }, orgId: string) {
  await prisma.userProfile.create({
    data: { id: user.id, email: user.email, fullName: "Test Admin", role: "admin" },
  });
  await prisma.organizationMembership.create({ data: { userId: user.id, organizationId: orgId } });
}

d("notification dispatch (org scoping + demo suppression)", () => {
  beforeAll(async () => {
    // Clean any leftovers, then build two normal orgs and one demo org, each with
    // one admin. Memberships cascade-delete with the org; profiles are removed in
    // afterAll (they're not org-owned).
    await Promise.all([destroyOrg(ORG_A), destroyOrg(ORG_B), destroyOrg(ORG_DEMO)]);
    await prisma.userProfile.deleteMany({
      where: { id: { in: [ADMIN_A.id, ADMIN_B.id, ADMIN_DEMO.id] } },
    });
    await createOrganization({ id: ORG_A, name: "Notify A", isDemo: false });
    await createOrganization({ id: ORG_B, name: "Notify B", isDemo: false });
    await createOrganization({ id: ORG_DEMO, name: "Notify Demo", isDemo: true });
    await seedAdmin(ADMIN_A, ORG_A);
    await seedAdmin(ADMIN_B, ORG_B);
    await seedAdmin(ADMIN_DEMO, ORG_DEMO);
  });

  afterAll(async () => {
    await Promise.all([destroyOrg(ORG_A), destroyOrg(ORG_B), destroyOrg(ORG_DEMO)]);
    await prisma.userProfile.deleteMany({
      where: { id: { in: [ADMIN_A.id, ADMIN_B.id, ADMIN_DEMO.id] } },
    });
    await prisma.$disconnect();
  });

  beforeEach(() => {
    sendEmailMock.mockClear();
  });

  it("admin alert reaches only the event org's admins, not another org's", async () => {
    await notifyAdminNewReferral({
      organizationId: ORG_A,
      partnerId: "partner_does_not_exist", // resolves to "A partner" — no throw
      contactName: "Acme Co",
      referralUrl: "https://example.test/admin/referrals/x",
    });
    const recipients = sendEmailMock.mock.calls.map((c) => c[0]);
    expect(recipients).toContain(ADMIN_A.email);
    expect(recipients).not.toContain(ADMIN_B.email);
    expect(recipients).not.toContain(ADMIN_DEMO.email);
  });

  it("admin alert in a demo org sends nothing", async () => {
    await notifyAdminNewReferral({
      organizationId: ORG_DEMO,
      partnerId: "partner_does_not_exist",
      contactName: "Acme Co",
      referralUrl: "https://example.test/admin/referrals/x",
    });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("lifecycle invite in a normal org sends and reports accepted", async () => {
    const ok = await notifyPartnerInvited({
      organizationId: ORG_A,
      to: "invitee@example.test",
      fullName: "Invitee",
      link: "https://example.test/invite/x",
    });
    expect(ok).toBe(true);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock.mock.calls[0]?.[0]).toBe("invitee@example.test");
  });

  it("lifecycle invite in a demo org is suppressed and reports not-accepted", async () => {
    const ok = await notifyPartnerInvited({
      organizationId: ORG_DEMO,
      to: "invitee@example.test",
      fullName: "Invitee",
      link: "https://example.test/invite/x",
    });
    expect(ok).toBe(false);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
