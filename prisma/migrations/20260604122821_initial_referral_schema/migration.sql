-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('admin', 'partner');

-- CreateEnum
CREATE TYPE "partner_status" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "partner_entry_type" AS ENUM ('invited', 'self_signup');

-- CreateEnum
CREATE TYPE "referral_status" AS ENUM ('submitted', 'contacted', 'meeting_scheduled', 'proposal_sent', 'negotiating', 'deal_closed', 'no_response', 'not_qualified', 'lost');

-- CreateEnum
CREATE TYPE "invoice_status" AS ENUM ('draft', 'sent', 'paid');

-- CreateEnum
CREATE TYPE "invite_status" AS ENUM ('pending', 'accepted', 'revoked', 'expired');

-- CreateEnum
CREATE TYPE "marketing_item_kind" AS ENUM ('file', 'link');

-- CreateEnum
CREATE TYPE "activity_action" AS ENUM ('created', 'updated', 'deleted', 'status_changed', 'approved', 'rejected', 'invoice_paid', 'payout_recorded', 'logged_in', 'logged_out');

-- CreateEnum
CREATE TYPE "activity_entity_type" AS ENUM ('partner', 'referral', 'invoice', 'payout', 'marketing_section', 'marketing_item', 'partner_invite', 'user');

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "role" "user_role" NOT NULL DEFAULT 'partner',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "user_id" UUID,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company_name" TEXT,
    "role" TEXT,
    "location" TEXT,
    "website" TEXT,
    "how_did_you_hear" TEXT,
    "types_of_referrals" TEXT,
    "status" "partner_status" NOT NULL DEFAULT 'pending',
    "entry_type" "partner_entry_type" NOT NULL,
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "contact_email" TEXT,
    "contact_company" TEXT,
    "contact_phone" TEXT,
    "contact_website" TEXT,
    "notes" TEXT,
    "status" "referral_status" NOT NULL DEFAULT 'submitted',
    "commission_rate" DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    "contract_ended_at" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "referral_id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "invoice_status" NOT NULL DEFAULT 'draft',
    "issued_date" DATE NOT NULL,
    "paid_date" DATE,
    "public_note" TEXT,
    "private_note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "referral_id" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "public_note" TEXT,
    "private_note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_invites" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "full_name" TEXT,
    "company_name" TEXT,
    "location" TEXT,
    "website" TEXT,
    "status" "invite_status" NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMPTZ,
    "accepted_at" TIMESTAMPTZ,
    "partner_id" TEXT,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "partner_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_sections" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "marketing_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_items" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "marketing_item_kind" NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT,
    "storage_path" TEXT,
    "file_name" TEXT,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "marketing_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_config" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "standard_commission_rate" DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    "commission_valid_months" INTEGER NOT NULL DEFAULT 12,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "app_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "action" "activity_action" NOT NULL,
    "entity_type" "activity_entity_type" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "entity_name" TEXT,
    "changes" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partners_user_id_key" ON "partners"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "partners_email_key" ON "partners"("email");

-- CreateIndex
CREATE INDEX "partners_status_created_at_idx" ON "partners"("status", "created_at");

-- CreateIndex
CREATE INDEX "referrals_partner_id_status_idx" ON "referrals"("partner_id", "status");

-- CreateIndex
CREATE INDEX "referrals_status_created_at_idx" ON "referrals"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");

-- CreateIndex
CREATE INDEX "invoices_referral_id_idx" ON "invoices"("referral_id");

-- CreateIndex
CREATE INDEX "invoices_partner_id_status_idx" ON "invoices"("partner_id", "status");

-- CreateIndex
CREATE INDEX "invoices_status_issued_date_idx" ON "invoices"("status", "issued_date");

-- CreateIndex
CREATE INDEX "payouts_partner_id_idx" ON "payouts"("partner_id");

-- CreateIndex
CREATE INDEX "payouts_referral_id_idx" ON "payouts"("referral_id");

-- CreateIndex
CREATE UNIQUE INDEX "partner_invites_token_key" ON "partner_invites"("token");

-- CreateIndex
CREATE INDEX "partner_invites_partner_id_idx" ON "partner_invites"("partner_id");

-- CreateIndex
CREATE INDEX "partner_invites_created_by_user_id_idx" ON "partner_invites"("created_by_user_id");

-- CreateIndex
CREATE INDEX "partner_invites_email_idx" ON "partner_invites"("email");

-- CreateIndex
CREATE INDEX "marketing_items_section_id_idx" ON "marketing_items"("section_id");

-- CreateIndex
CREATE INDEX "activity_log_user_id_idx" ON "activity_log"("user_id");

-- CreateIndex
CREATE INDEX "activity_log_entity_type_entity_id_idx" ON "activity_log"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "partners" ADD CONSTRAINT "partners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "referrals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_invites" ADD CONSTRAINT "partner_invites_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_invites" ADD CONSTRAINT "partner_invites_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_items" ADD CONSTRAINT "marketing_items_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "marketing_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ============================================================
-- Partial index — commission sums only ever read paid invoices.
-- ============================================================
CREATE INDEX "invoices_referral_id_paid_idx" ON "invoices"("referral_id") WHERE "status" = 'paid';

-- ============================================================
-- Row-Level Security
-- The app reads/writes through Prisma over the owner connection, which BYPASSES
-- RLS. Enabling RLS with NO policy locks every table against the anon/authenticated
-- roles that PostgREST exposes via the publishable key (defense-in-depth). Do NOT
-- FORCE — that would also block Prisma. Granular partner-scoped policies are added
-- with the app layer.
-- ============================================================
ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "partners" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "referrals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payouts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "partner_invites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "marketing_sections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "marketing_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app_config" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activity_log" ENABLE ROW LEVEL SECURITY;
