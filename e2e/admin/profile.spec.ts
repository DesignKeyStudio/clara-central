import { test, expect } from "@playwright/test";
import { ADMIN_PROFILE } from "../constants";

/**
 * Admin · Profile (read-only). Admins edit only their identity (name + phone),
 * with Email read-only and none of the partner-only fields; and — data isolation
 * — an admin can't reach the partner profile. Runs in the `admin` project.
 */

test("admin profile shows name + phone only, Email read-only, no partner fields", async ({ page }) => {
  await page.goto("/admin/profile");
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();

  const email = page.getByRole("textbox", { name: "Email" });
  await expect(email).toBeDisabled();
  await expect(email).toHaveValue(ADMIN_PROFILE.email);

  await expect(page.getByRole("textbox", { name: /Full name/ })).toHaveValue(ADMIN_PROFILE.fullName);
  await expect(page.getByRole("textbox", { name: "Phone" })).toBeVisible();

  // No partner-only fields, no notification checkboxes.
  await expect(page.getByRole("textbox", { name: /Company/ })).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Website" })).toHaveCount(0);
  await expect(page.getByRole("checkbox")).toHaveCount(0);
});

test("an admin cannot reach the partner profile (bounced to /admin)", async ({ page }) => {
  await page.goto("/partner/profile");
  await expect(page).toHaveURL(/\/admin$/);
});
