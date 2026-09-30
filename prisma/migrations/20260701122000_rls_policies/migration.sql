-- TKT-006: Row-Level Security policies (defense in depth).
--
-- The initial migration ENABLED RLS on every table but shipped ZERO policies, which
-- fully locks each table against the Supabase `anon` / `authenticated` PostgREST
-- roles. The Prisma app connects as the table owner and BYPASSES RLS, so it keeps
-- working unchanged — these policies only ever apply to the anon/authenticated
-- roles. They exist so that any current or future PostgREST / supabase-js access is
-- automatically partner-scoped instead of exposing cross-partner data.
--
-- Model:
--   * Partner principals (auth.uid() = partners.user_id) may read ONLY their own
--     partner row and their own referrals / invoices / payouts.
--   * Admin principals (JWT app_metadata.role = 'admin') may read across all rows.
--   * Marketing library + app config: any authenticated user may read; only admins
--     may write.
--   * partner_invites + activity_log: admin-only.
--   * `anon` gets NO policy on any table → it remains fully denied (the public
--     `/r/[code]` and `/apply` pages read via Prisma/owner, so they are unaffected).
--
-- NOTE: this migration uses Supabase's `auth.uid()` / `auth.jwt()` helpers, so it is
-- intended to run against the Supabase database (via `prisma migrate deploy` on the
-- direct connection), not a vanilla Postgres shadow DB.

-- Admin predicate — true when the caller's Supabase JWT carries app_metadata.role = 'admin'.
CREATE OR REPLACE FUNCTION public.claracentral_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- ── user_profiles ──
CREATE POLICY "user_profiles_admin_read" ON "user_profiles"
  FOR SELECT TO authenticated USING (public.claracentral_is_admin());
CREATE POLICY "user_profiles_self_read" ON "user_profiles"
  FOR SELECT TO authenticated USING ("id" = auth.uid());

-- ── partners ──
CREATE POLICY "partners_admin_read" ON "partners"
  FOR SELECT TO authenticated USING (public.claracentral_is_admin());
CREATE POLICY "partners_self_read" ON "partners"
  FOR SELECT TO authenticated USING ("user_id" = auth.uid());

-- ── referrals ──
CREATE POLICY "referrals_admin_read" ON "referrals"
  FOR SELECT TO authenticated USING (public.claracentral_is_admin());
CREATE POLICY "referrals_partner_read" ON "referrals"
  FOR SELECT TO authenticated
  USING ("partner_id" IN (SELECT "id" FROM "partners" WHERE "user_id" = auth.uid()));

-- ── invoices ── (partner_id is denormalized onto the row)
CREATE POLICY "invoices_admin_read" ON "invoices"
  FOR SELECT TO authenticated USING (public.claracentral_is_admin());
CREATE POLICY "invoices_partner_read" ON "invoices"
  FOR SELECT TO authenticated
  USING ("partner_id" IN (SELECT "id" FROM "partners" WHERE "user_id" = auth.uid()));

-- ── payouts ──
CREATE POLICY "payouts_admin_read" ON "payouts"
  FOR SELECT TO authenticated USING (public.claracentral_is_admin());
CREATE POLICY "payouts_partner_read" ON "payouts"
  FOR SELECT TO authenticated
  USING ("partner_id" IN (SELECT "id" FROM "partners" WHERE "user_id" = auth.uid()));

-- ── partner_invites ── (admin-only; onboarding is served via Prisma/owner)
CREATE POLICY "partner_invites_admin_read" ON "partner_invites"
  FOR SELECT TO authenticated USING (public.claracentral_is_admin());

-- ── marketing_sections ── (any authenticated read; admin write)
CREATE POLICY "marketing_sections_auth_read" ON "marketing_sections"
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "marketing_sections_admin_write" ON "marketing_sections"
  FOR ALL TO authenticated
  USING (public.claracentral_is_admin())
  WITH CHECK (public.claracentral_is_admin());

-- ── marketing_items ── (any authenticated read; admin write)
CREATE POLICY "marketing_items_auth_read" ON "marketing_items"
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "marketing_items_admin_write" ON "marketing_items"
  FOR ALL TO authenticated
  USING (public.claracentral_is_admin())
  WITH CHECK (public.claracentral_is_admin());

-- ── app_config ── (any authenticated read — e.g. payout-cadence note; admin write)
CREATE POLICY "app_config_auth_read" ON "app_config"
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "app_config_admin_write" ON "app_config"
  FOR ALL TO authenticated
  USING (public.claracentral_is_admin())
  WITH CHECK (public.claracentral_is_admin());

-- ── activity_log ── (admin-only)
CREATE POLICY "activity_log_admin_read" ON "activity_log"
  FOR SELECT TO authenticated USING (public.claracentral_is_admin());
