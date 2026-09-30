-- Track last demo activity for idle-based cleanup of demo orgs. NOT NULL with a
-- default is safe on the populated table (existing rows adopt now()).
ALTER TABLE "organizations" ADD COLUMN "last_active_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "organizations_is_demo_last_active_at_idx" ON "organizations"("is_demo", "last_active_at");
