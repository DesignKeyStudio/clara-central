import { test, expect } from "@playwright/test";
import { PARTNER_PROFILE } from "../constants";

/**
 * Partner · Profile (read-only). The account page prefills the partner's own
 * contact card, keeps Email read-only (login identity), defaults notifications to
 * Email-on / SMS-off, and — data isolation — a partner can't reach the admin
 * profile. Runs in the `partner` project (partner storageState).
 */

test("partner profile prefills, Email is read-only, notification defaults (email on / sms off)", async ({
  page,
}) => {
  await page.goto("/partner/profile");
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();

  // Email is the login identity — shown but disabled (a textbox, distinct from
  // the "Email" notification checkbox below).
  const email = page.getByRole("textbox", { name: "Email" });
  await expect(email).toBeDisabled();
  await expect(email).toHaveValue(PARTNER_PROFILE.email);

  // Contact fields prefilled from the seed.
  await expect(page.getByRole("textbox", { name: /Full name/ })).toHaveValue(PARTNER_PROFILE.fullName);
  await expect(page.getByRole("textbox", { name: "Phone" })).toHaveValue(PARTNER_PROFILE.phone);
  await expect(page.getByRole("textbox", { name: /Company/ })).toHaveValue(PARTNER_PROFILE.company);
  await expect(page.getByRole("textbox", { name: /Role/ })).toHaveValue(PARTNER_PROFILE.role);
  await expect(page.getByRole("textbox", { name: "Location" })).toHaveValue(PARTNER_PROFILE.location);
  await expect(page.getByRole("textbox", { name: "Website" })).toHaveValue("");

  // Notification defaults.
  await expect(page.getByRole("checkbox", { name: "Email" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "SMS" })).not.toBeChecked();
});

test("a partner cannot reach the admin profile (bounced to /partner)", async ({ page }) => {
  await page.goto("/admin/profile");
  await expect(page).toHaveURL(/\/partner$/);
});
