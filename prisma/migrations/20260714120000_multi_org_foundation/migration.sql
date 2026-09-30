-- Multi-organization foundation.
--
-- Adds Organization + OrganizationMembership, scopes every domain table with
-- `organization_id`, backfills all pre-existing data into the fixed "Default"
-- org (id 'org_default'), and swaps the two global uniques that would collide
-- across orgs (partner email, invoice number) to per-org composite uniques.
--
-- App-level scoping is the real enforcement — the Prisma app connects as the
-- table owner and BYPASSES RLS. RLS on the two new tables here is dormant
-- defense-in-depth (enabled, ZERO policies → anon/authenticated fully denied),
-- matching the posture of every other table (see 20260701122000_rls_policies).

-- ── New tenancy tables ──
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "organizations_is_demo_created_at_idx" ON "organizations"("is_demo", "created_at");

CREATE TABLE "organization_memberships" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "organization_memberships_user_id_organization_id_key" ON "organization_memberships"("user_id", "organization_id");
CREATE INDEX "organization_memberships_organization_id_idx" ON "organization_memberships"("organization_id");

ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_memberships" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "organization_memberships"
    ADD CONSTRAINT "organization_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "organization_memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Seed the Default org + membership for every existing user ──
INSERT INTO "organizations" ("id", "name", "is_demo", "created_at", "updated_at")
VALUES ('org_default', 'Clara Central', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "organization_memberships" ("id", "user_id", "organization_id", "created_at", "updated_at")
SELECT 'orgmem_' || replace(gen_random_uuid()::text, '-', ''), "id", 'org_default', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "user_profiles";

-- ── partners ── (email unique becomes per-org)
ALTER TABLE "partners" ADD COLUMN "organization_id" TEXT;
UPDATE "partners" SET "organization_id" = 'org_default';
ALTER TABLE "partners" ALTER COLUMN "organization_id" SET NOT NULL;
DROP INDEX "partners_email_key";
CREATE UNIQUE INDEX "partners_organization_id_email_key" ON "partners"("organization_id", "email");
DROP INDEX "partners_status_created_at_idx";
CREATE INDEX "partners_organization_id_status_created_at_idx" ON "partners"("organization_id", "status", "created_at");
ALTER TABLE "partners" ADD CONSTRAINT "partners_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── referrals ──
ALTER TABLE "referrals" ADD COLUMN "organization_id" TEXT;
UPDATE "referrals" SET "organization_id" = 'org_default';
ALTER TABLE "referrals" ALTER COLUMN "organization_id" SET NOT NULL;
DROP INDEX "referrals_status_created_at_idx";
CREATE INDEX "referrals_organization_id_status_created_at_idx" ON "referrals"("organization_id", "status", "created_at");
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── invoices ── (number unique becomes per-org)
ALTER TABLE "invoices" ADD COLUMN "organization_id" TEXT;
UPDATE "invoices" SET "organization_id" = 'org_default';
ALTER TABLE "invoices" ALTER COLUMN "organization_id" SET NOT NULL;
DROP INDEX "invoices_number_key";
CREATE UNIQUE INDEX "invoices_organization_id_number_key" ON "invoices"("organization_id", "number");
DROP INDEX "invoices_status_issued_date_idx";
CREATE INDEX "invoices_organization_id_status_issued_date_idx" ON "invoices"("organization_id", "status", "issued_date");
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── payouts ──
ALTER TABLE "payouts" ADD COLUMN "organization_id" TEXT;
UPDATE "payouts" SET "organization_id" = 'org_default';
ALTER TABLE "payouts" ALTER COLUMN "organization_id" SET NOT NULL;
CREATE INDEX "payouts_organization_id_idx" ON "payouts"("organization_id");
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── partner_invites ──
ALTER TABLE "partner_invites" ADD COLUMN "organization_id" TEXT;
UPDATE "partner_invites" SET "organization_id" = 'org_default';
ALTER TABLE "partner_invites" ALTER COLUMN "organization_id" SET NOT NULL;
DROP INDEX "partner_invites_email_idx";
CREATE INDEX "partner_invites_organization_id_email_idx" ON "partner_invites"("organization_id", "email");
ALTER TABLE "partner_invites" ADD CONSTRAINT "partner_invites_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── marketing_sections ──
ALTER TABLE "marketing_sections" ADD COLUMN "organization_id" TEXT;
UPDATE "marketing_sections" SET "organization_id" = 'org_default';
ALTER TABLE "marketing_sections" ALTER COLUMN "organization_id" SET NOT NULL;
CREATE INDEX "marketing_sections_organization_id_idx" ON "marketing_sections"("organization_id");
ALTER TABLE "marketing_sections" ADD CONSTRAINT "marketing_sections_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── marketing_items ──
ALTER TABLE "marketing_items" ADD COLUMN "organization_id" TEXT;
UPDATE "marketing_items" SET "organization_id" = 'org_default';
ALTER TABLE "marketing_items" ALTER COLUMN "organization_id" SET NOT NULL;
CREATE INDEX "marketing_items_organization_id_idx" ON "marketing_items"("organization_id");
ALTER TABLE "marketing_items" ADD CONSTRAINT "marketing_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── activity_log ──
ALTER TABLE "activity_log" ADD COLUMN "organization_id" TEXT;
UPDATE "activity_log" SET "organization_id" = 'org_default';
ALTER TABLE "activity_log" ALTER COLUMN "organization_id" SET NOT NULL;
CREATE INDEX "activity_log_organization_id_created_at_idx" ON "activity_log"("organization_id", "created_at");
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── app_config ── (was a global singleton; now one row per org)
ALTER TABLE "app_config" ADD COLUMN "organization_id" TEXT;
UPDATE "app_config" SET "organization_id" = 'org_default';
-- Guarantee the Default org has a config row even if the singleton was never seeded.
INSERT INTO "app_config" ("id", "organization_id", "updated_at")
SELECT 'singleton', 'org_default', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "app_config" WHERE "organization_id" = 'org_default');
ALTER TABLE "app_config" ALTER COLUMN "organization_id" SET NOT NULL;
-- id is now a client-assigned TypeID (cfg_…) instead of the fixed 'singleton'.
ALTER TABLE "app_config" ALTER COLUMN "id" DROP DEFAULT;
CREATE UNIQUE INDEX "app_config_organization_id_key" ON "app_config"("organization_id");
ALTER TABLE "app_config" ADD CONSTRAINT "app_config_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
