import { test, expect } from "@playwright/test";

/**
 * Admin — access control (read-only). An already-authenticated admin who lands
 * on the login screen is bounced into the panel (ISO-03). The complementary
 * "admin confined to /admin" redirect lives in admin/referrals.spec.ts.
 */

test("an authenticated admin is redirected away from the login screen", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});
