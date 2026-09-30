-- Move commission rate from per-referral to per-partner.
-- One rate on the Partner now applies to all of that partner's referrals.

-- 1. Add the per-partner rate (system standard default).
ALTER TABLE "partners" ADD COLUMN "commission_rate" DECIMAL(5,2) NOT NULL DEFAULT 10.00;

-- 2. Backfill: each partner inherits the highest rate among their existing
--    referrals (the prior "representative rate"), preserving displayed totals.
UPDATE "partners" p
SET "commission_rate" = sub.max_rate
FROM (
  SELECT "partner_id", MAX("commission_rate") AS max_rate
  FROM "referrals"
  GROUP BY "partner_id"
) sub
WHERE p."id" = sub."partner_id";

-- 3. Drop the now-redundant per-referral rate.
ALTER TABLE "referrals" DROP COLUMN "commission_rate";
