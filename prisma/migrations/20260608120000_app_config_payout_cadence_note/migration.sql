-- Add an optional free-text payout-cadence note to the singleton app config.
-- Shown to partners on the Payouts page; omitted from the UI when null/blank.

ALTER TABLE "app_config" ADD COLUMN "payout_cadence_note" TEXT;
