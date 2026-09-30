import { test, expect } from "@playwright/test";
import { PARTNER_REFERRAL_CONTACT, OTHER_REFERRAL_CONTACT } from "../constants";

/**
 * Admin portal. Runs in the `admin` project, which starts authenticated via the
 * saved admin session (e2e/.auth/admin.json) — no login step here.
 */

test.describe("Admin portal", () => {
  test("dashboard loads for an authenticated admin", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("referrals page lists seeded referrals across all partners", async ({ page }) => {
    await page.goto("/admin/referrals");
    await expect(page.getByRole("heading", { name: "Referrals" })).toBeVisible();

    // Seeded data (prisma/seed.ts) — the admin sees referrals from every partner.
    await expect(page.getByText(PARTNER_REFERRAL_CONTACT)).toBeVisible();
    await expect(page.getByText(OTHER_REFERRAL_CONTACT)).toBeVisible();
  });

  test("an admin is confined to the admin portal", async ({ page }) => {
    await page.goto("/partner");
    // Middleware bounces admins out of /partner/* back to /admin.
    await expect(page).toHaveURL(/\/admin$/);
  });
});
