/**
 * Tenant-isolation integration test (real DB).
 *
 * The multi-org foundation's core guarantee: one organization can never read or
 * mutate another's data. This seeds TWO throwaway orgs (A and B), each with its
 * own partner + referral + paid invoice + config, then asserts every service is
 * scoped — org A's calls see only org A's rows, and cross-org id access is a
 * null / no-op, never a leak.
 *
 * Requires a reachable Postgres (DATABASE_URL) — skipped when absent. Run:
 *   pnpm test
 * Self-cleaning: both test orgs are deleted (cascade) in afterAll, so it never
 * touches the seeded Default org.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { createOrganization } from "@/lib/services/organization-service";
import {
  deletePartner,
  getPartnerDetail,
  listPartners,
  setPartnerStatus,
} from "@/lib/services/partner-service";
import { getReferralDetail, listReferrals } from "@/lib/services/referral-service";
import { recordPayout } from "@/lib/services/payout-service";
import { getAppConfig, updateAppConfig } from "@/lib/services/app-config-service";

const HAS_DB = Boolean(process.env.DATABASE_URL);
const d = HAS_DB ? describe : describe.skip;

// Fixed ids so a crashed run's leftovers are cleaned deterministically on rerun.
const ORG_A = "org_test_iso_a";
const ORG_B = "org_test_iso_b";

type Seeded = { partnerId: string; referralId: string; invoiceNumber: string };

async function seedOrg(orgId: string, tag: string): Promise<Seeded> {
  const partner = await prisma.partner.create({
    data: {
      organizationId: orgId,
      fullName: `Partner ${tag}`,
      email: `partner-${tag}@iso.test`,
      referralCode: `iso-${tag}-${orgId}`,
      entryType: "invited",
      status: "approved",
      commissionRate: 10,
    },
  });
  const referral = await prisma.referral.create({
    data: {
      organizationId: orgId,
      partnerId: partner.id,
      contactName: `Lead ${tag}`,
      status: "deal_closed",
      commissionRate: 10,
    },
  });
  const invoiceNumber = `ISO-${tag}-1`;
  await prisma.invoice.create({
    data: {
      organizationId: orgId,
      number: invoiceNumber,
      referralId: referral.id,
      partnerId: partner.id,
      amount: 1000,
      status: "paid",
      issuedDate: new Date("2026-01-01"),
      paidDate: new Date("2026-01-05"),
    },
  });
  return { partnerId: partner.id, referralId: referral.id, invoiceNumber };
}

async function destroyOrg(orgId: string) {
  // Cascade removes partners/referrals/invoices/payouts/appConfig/memberships.
  await prisma.organization.deleteMany({ where: { id: orgId } });
}

let a: Seeded;
let b: Seeded;

d("multi-org tenant isolation", () => {
  beforeAll(async () => {
    await destroyOrg(ORG_A);
    await destroyOrg(ORG_B);
    await createOrganization({ id: ORG_A, name: "Iso Org A" });
    await createOrganization({ id: ORG_B, name: "Iso Org B" });
    a = await seedOrg(ORG_A, "a");
    b = await seedOrg(ORG_B, "b");
  });

  afterAll(async () => {
    await destroyOrg(ORG_A);
    await destroyOrg(ORG_B);
    await prisma.$disconnect();
  });

  it("listPartners returns only the caller org's partners", async () => {
    const rows = await listPartners(ORG_A);
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(a.partnerId);
    expect(ids).not.toContain(b.partnerId);
  });

  it("listReferrals returns only the caller org's referrals", async () => {
    const rows = await listReferrals(ORG_A);
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(a.referralId);
    expect(ids).not.toContain(b.referralId);
  });

  it("getPartnerDetail cannot read another org's partner", async () => {
    expect(await getPartnerDetail(ORG_A, b.partnerId)).toBeNull();
    expect(await getPartnerDetail(ORG_A, a.partnerId)).not.toBeNull();
  });

  it("getReferralDetail cannot read another org's referral", async () => {
    expect(await getReferralDetail(ORG_A, b.referralId)).toBeNull();
    expect(await getReferralDetail(ORG_A, a.referralId)).not.toBeNull();
  });

  it("setPartnerStatus is a no-op on another org's partner", async () => {
    await setPartnerStatus(ORG_A, b.partnerId, "rejected");
    const bPartner = await prisma.partner.findUnique({
      where: { id: b.partnerId },
      select: { status: true },
    });
    expect(bPartner?.status).toBe("approved"); // unchanged
  });

  it("deletePartner cannot delete another org's partner", async () => {
    const result = await deletePartner(ORG_A, b.partnerId);
    expect(result).toBeNull();
    const stillThere = await prisma.partner.findUnique({ where: { id: b.partnerId } });
    expect(stillThere).not.toBeNull();
  });

  it("recordPayout rejects a referralId from another org (CR fix)", async () => {
    const result = await recordPayout(ORG_A, {
      partnerId: a.partnerId,
      referralId: b.referralId, // foreign referral
      amount: 100,
    });
    expect(result).toBeNull();
    const leaked = await prisma.payout.findFirst({ where: { referralId: b.referralId } });
    expect(leaked).toBeNull(); // nothing written against org B's referral
  });

  it("recordPayout rejects a partnerId from another org", async () => {
    const result = await recordPayout(ORG_A, {
      partnerId: b.partnerId, // foreign partner
      referralId: null,
      amount: 100,
    });
    expect(result).toBeNull();
  });

  it("recordPayout succeeds for the caller org's own partner+referral", async () => {
    const result = await recordPayout(ORG_A, {
      partnerId: a.partnerId,
      referralId: a.referralId,
      amount: 100,
    });
    expect(result).not.toBeNull();
  });

  it("AppConfig is per-org — editing one org's config never affects another", async () => {
    await updateAppConfig(ORG_A, {
      standardCommissionRate: 25,
      commissionValidMonths: 6,
      payoutCadenceNote: "A only",
    });
    const bConfig = await getAppConfig(ORG_B);
    expect(bConfig.standardCommissionRate).toBe(10); // untouched default
    expect(bConfig.commissionValidMonths).toBe(12);
    expect(bConfig.payoutCadenceNote).toBeNull();
    const aConfig = await getAppConfig(ORG_A);
    expect(aConfig.standardCommissionRate).toBe(25);
  });
});
