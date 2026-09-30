import { test, expect } from "@playwright/test";
import { ADMIN, PARTNER } from "../constants";

/**
 * Auth + landing flows. These run in the `auth-flows` project, which has NO
 * stored session — every test starts logged out, so it genuinely exercises the
 * login screens (unlike the admin/partner specs, which start authenticated).
 */

test.describe("Landing & sign-in", () => {
  test("landing offers both portals", async ({ page }) => {
    await page.goto("/");
    // Partner-first landing (auth redesign): the partner entry is the "Sign in to
    // your portal" card (→ /partner/login); admin sign-in is a demoted footer link.
    await expect(page.getByRole("link", { name: /Sign in to your portal/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Admin login/i })).toBeVisible();
  });

  test("admin signs in with valid credentials", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByLabel("Password").fill(ADMIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("admin sign-in rejects a wrong password", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByLabel("Password").fill("definitely-wrong");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Invalid email or password.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("partner signs in via the OTP flow", async ({ page }) => {
    await page.goto("/partner/login");
    await page.getByLabel("Email").fill(PARTNER.email);
    await page.getByRole("button", { name: "Send code" }).click();

    // Mocked OTP — any 6 digits work. input-otp auto-submits via onComplete once
    // the 6th digit lands; no explicit "Verify & sign in" click needed.
    await page.getByLabel("6-digit verification code").fill("123456");

    await expect(page).toHaveURL(/\/partner$/);
    await expect(page.getByRole("heading", { name: "My Referrals" })).toBeVisible();
  });

  test("partner OTP rejects an unknown email", async ({ page }) => {
    await page.goto("/partner/login");
    await page.getByLabel("Email").fill("nobody@nowhere.test");
    await page.getByRole("button", { name: "Send code" }).click();

    // Unknown emails are rejected at the "Send code" step (requestPartnerOtp gates
    // on an approved, linked partner), so the OTP screen is never reached — the
    // error appears on the email form itself.
    await expect(page.getByText("No active partner account for that email.")).toBeVisible();
    await expect(page.getByLabel("6-digit verification code")).toHaveCount(0);
  });
});
