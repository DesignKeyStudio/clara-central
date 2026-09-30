import { test, expect } from "@playwright/test";
import { reseed } from "../reseed";

/**
 * Admin · Profile (MUTATING). Editing name + phone persists across a reload and
 * the sidebar display name updates live. Serial + reseed after each test.
 */
test.describe.configure({ mode: "serial", timeout: 120_000 });
test.afterEach(() => reseed());

test("an admin edits their profile — name + phone persist, sidebar updates", async ({ page }) => {
  await page.goto("/admin/profile");

  await page.getByRole("textbox", { name: /Full name/ }).fill("Admin User QA");
  await page.getByRole("textbox", { name: "Phone" }).fill("(555) 999-0000");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByText("Profile updated")).toBeVisible();

  // Sidebar name reflects the edit without a manual reload.
  await expect(page.getByRole("button", { name: "Admin User QA" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("textbox", { name: /Full name/ })).toHaveValue("Admin User QA");
  await expect(page.getByRole("textbox", { name: "Phone" })).toHaveValue("(555) 999-0000");
});
