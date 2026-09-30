-- TKT-002: Public per-partner referral links.
-- Adds Partner.referralCode (a stable, hard-to-guess public slug for /r/{code}).
-- Added nullable first, backfilled for existing partners, then made NOT NULL +
-- UNIQUE so the deploy is safe against a table that already has rows.

-- 1. Add the column (nullable for the backfill step).
ALTER TABLE "partners" ADD COLUMN "referral_code" TEXT;

-- 2. Backfill existing partners: a name slug + a random 10-char token. random()
--    is volatile (evaluated per row) and mixed with the row id, so every code is
--    distinct and unguessable. Falls back to 'partner' when the name has no
--    alphanumeric characters.
UPDATE "partners"
SET "referral_code" =
  coalesce(
    nullif(
      regexp_replace(
        regexp_replace(lower(coalesce("full_name", '')), '[^a-z0-9]+', '-', 'g'),
        '(^-+|-+$)', '', 'g'
      ),
      ''
    ),
    'partner'
  ) || '-' || substr(md5(random()::text || "id"), 1, 10)
WHERE "referral_code" IS NULL;

-- 3. Enforce NOT NULL now that every row has a value.
ALTER TABLE "partners" ALTER COLUMN "referral_code" SET NOT NULL;

-- 4. Unique index (matches Prisma's @unique naming for the mapped column).
CREATE UNIQUE INDEX "partners_referral_code_key" ON "partners"("referral_code");
