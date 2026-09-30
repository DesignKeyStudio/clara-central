/**
 * Demo feature — service-layer integration test (real DB).
 *
 * Covers the parts that don't need a browser/auth: seeding a fresh demo org,
 * the primary-partner lookup a `role=partner` demo links to, the global cap
 * count, and the cleanup selection + cascade. (Auth-user provisioning + session
 * planting + cookie reuse are exercised e2e/manually — vitest can't plant cookies
 * or mint Supabase sessions.)
 *
 * Requires DATABASE_URL — skipped when absent. Self-cleaning. Run: pnpm test
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { createOrganization } from "@/lib/services/organization-service";
import {
  seedOrgData,
  liveDemoOrgCount,
  findDemoPrimaryPartnerId,
} from "@/lib/services/demo-service";
import { ORG_DEFAULT_ID } from "@/lib/organization";

const HAS_DB = Boolean(process.env.DATABASE_URL);
const d = HAS_DB ? describe : describe.skip;

const ORG_STALE = "org_test_demo_stale";
const ORG_FRESH = "org_test_demo_fresh";
const RETENTION_DAYS = 30;

async function destroy(orgId: string) {
  await prisma.organization.deleteMany({ where: { id: orgId } });
}

d("demo feature (service layer)", () => {
  beforeAll(async () => {
    await destroy(ORG_STALE);
    await destroy(ORG_FRESH);
    await createOrganization({ id: ORG_STALE, name: "Demo Stale", isDemo: true });
    await createOrganization({ id: ORG_FRESH, name: "Demo Fresh", isDemo: true });
    // Age the stale one past the retention window.
    await prisma.organization.update({
      where: { id: ORG_STALE },
      data: { lastActiveAt: new Date(Date.now() - (RETENTION_DAYS + 10) * 24 * 60 * 60 * 1000) },
    });
    await seedOrgData(ORG_STALE);
  });

  afterAll(async () => {
    await destroy(ORG_STALE);
    await destroy(ORG_FRESH);
    await prisma.$disconnect();
  });

  it("seedOrgData populates the org with the full dataset, all org-scoped", async () => {
    const where = { organizationId: ORG_STALE };
    const [partners, referrals, invoices, payouts] = await Promise.all([
      prisma.partner.count({ where }),
      prisma.referral.count({ where }),
      prisma.invoice.count({ where }),
      prisma.payout.count({ where }),
    ]);
    expect(partners).toBe(4);
    expect(referrals).toBe(9);
    expect(invoices).toBe(12);
    expect(payouts).toBe(2);
  });

  it("creates a per-org AppConfig (via createOrganization)", async () => {
    const cfg = await prisma.appConfig.findUnique({ where: { organizationId: ORG_STALE } });
    expect(cfg).not.toBeNull();
  });

  it("findDemoPrimaryPartnerId returns an approved partner in the org", async () => {
    const id = await findDemoPrimaryPartnerId(ORG_STALE);
    expect(id).toBeTruthy();
    const p = await prisma.partner.findFirst({
      where: { id: id!, organizationId: ORG_STALE },
      select: { status: true },
    });
    expect(p?.status).toBe("approved");
  });

  it("liveDemoOrgCount counts demo orgs (>= the two test orgs)", async () => {
    expect(await liveDemoOrgCount()).toBeGreaterThanOrEqual(2);
  });

  it("cleanup selection targets only idle demo orgs — not fresh demos, not Default", async () => {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const stale = await prisma.organization.findMany({
      where: { isDemo: true, lastActiveAt: { lt: cutoff } },
      select: { id: true },
    });
    const ids = stale.map((o) => o.id);
    expect(ids).toContain(ORG_STALE);
    expect(ids).not.toContain(ORG_FRESH);
    expect(ids).not.toContain(ORG_DEFAULT_ID); // Default is isDemo:false → never selected
  });

  it("deleting a demo org cascades its domain rows", async () => {
    await prisma.organization.delete({ where: { id: ORG_FRESH } });
    const [org, partners] = await Promise.all([
      prisma.organization.findUnique({ where: { id: ORG_FRESH } }),
      prisma.partner.count({ where: { organizationId: ORG_FRESH } }),
    ]);
    expect(org).toBeNull();
    expect(partners).toBe(0);
  });
});
