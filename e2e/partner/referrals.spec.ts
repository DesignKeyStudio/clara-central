import { test, expect } from "@playwright/test";
import { PARTNER_REFERRAL_CONTACT, OTHER_REFERRAL_CONTACT } from "../constants";

/**
 * Partner portal. Runs in the `partner` project, which starts authenticated via
 * the saved partner session (e2e/.auth/partner.json) — no login step here.
 */

test.describe("Partner portal", () => {
  test("partner sees their own referrals", async ({ page }) => {
    await page.goto("/partner");
    await expect(page.getByRole("heading", { name: "My Referrals" })).toBeVisible();
    await expect(page.getByText(PARTNER_REFERRAL_CONTACT)).toBeVisible();
  });

  test("partner does NOT see another partner's referrals", async ({ page }) => {
    await page.goto("/partner");
    await expect(page.getByText(PARTNER_REFERRAL_CONTACT)).toBeVisible();
    // Marcus Lee belongs to a different partner — must never leak into this view.
    await expect(page.getByText(OTHER_REFERRAL_CONTACT)).toHaveCount(0);
  });

  test("a partner is confined to the partner portal", async ({ page }) => {
    await page.goto("/admin");
    // Middleware bounces partners out of /admin/* back to /partner.
    await expect(page).toHaveURL(/\/partner$/);
  });
});
