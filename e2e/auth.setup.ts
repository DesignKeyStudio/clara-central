import { test as setup, expect } from "@playwright/test";
import { ADMIN, PARTNER, ADMIN_STATE, PARTNER_STATE } from "./constants";

/**
 * Auth setup — runs BEFORE the `admin` and `partner` projects (declared as
 * their `dependencies` in playwright.config.ts).
 *
 * Each block logs in once and saves the browser session (cookies + storage) to
 * a JSON file. The portal specs then start already authenticated via
 * `storageState`, instead of logging in for every single test. This is the
 * standard Playwright pattern for apps behind a login.
 */

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Password").fill(ADMIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();

  // The server action redirects to /admin on success.
  await page.waitForURL("**/admin");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.context().storageState({ path: ADMIN_STATE });
});

setup("authenticate as partner", async ({ page }) => {
  await page.goto("/partner/login");
  await page.getByLabel("Email").fill(PARTNER.email);
  await page.getByRole("button", { name: "Send code" }).click();

  // OTP is mocked server-side for now — any 6 digits are accepted. The input-otp
  // component auto-submits via onComplete once the 6th digit lands, so filling the
  // field is enough — no explicit "Verify & sign in" click (the button is already
  // relabeled "Verifying…" by then).
  await page.getByLabel("6-digit verification code").fill("123456");

  await page.waitForURL("**/partner");
  await expect(page.getByRole("heading", { name: "My Referrals" })).toBeVisible();

  await page.context().storageState({ path: PARTNER_STATE });
});
