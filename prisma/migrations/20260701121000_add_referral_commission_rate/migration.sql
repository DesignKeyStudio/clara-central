-- TKT-005: Commission-rate history (snapshot approach).
-- Snapshots the partner's commission rate onto each referral at creation time so
-- editing a partner's rate never retroactively re-prices past referrals. Added
-- with a default (safe on existing rows), then backfilled from each referral's
-- owning partner's CURRENT rate.

-- 1. Add the snapshot column with a default (existing rows get the default first).
ALTER TABLE "referrals" ADD COLUMN "commission_rate" DECIMAL(5,2) NOT NULL DEFAULT 10.00;

-- 2. Backfill each referral from its owning partner's current rate. This preserves
--    the numbers exactly as they read today (commission was derived from the
--    partner rate before this migration), so no balances shift on deploy.
UPDATE "referrals" r
SET "commission_rate" = p."commission_rate"
FROM "partners" p
WHERE r."partner_id" = p."id";
