import { test, expect } from "@playwright/test";
import { reseed } from "../reseed";

/**
 * Partner · Profile (MUTATING). Editing the profile persists across a reload,
 * a bare website host is normalized to https://, the SMS opt-in sticks, and the
 * sidebar display name updates live (server-user prefers the DB name). Serial +
 * reseed after each test — the reseed re-links the partner auth user by fixed id,
 * so the saved session stays valid.
 */
test.describe.configure({ mode: "serial", timeout: 120_000 });
test.afterEach(() => reseed());

test("a partner edits their profile — persists, normalizes website, toggles SMS, updates sidebar", async ({
  page,
}) => {
  await page.goto("/partner/profile");

  await page.getByRole("textbox", { name: /Full name/ }).fill("Jordan Diaz QA");
  await page.getByRole("textbox", { name: "Phone" }).fill("(555) 111-2222");
  await page.getByRole("textbox", { name: /Company/ }).fill("Diaz Group QA");
  await page.getByRole("textbox", { name: /Role/ }).fill("Principal");
  await page.getByRole("textbox", { name: "Website" }).fill("diazgroup.com");
  await page.getByRole("checkbox", { name: "SMS" }).check();

  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByText("Profile updated")).toBeVisible();

  // Sidebar name reflects the edit without a manual reload (DB-name preference).
  await expect(page.getByRole("button", { name: "Jordan Diaz QA" })).toBeVisible();

  // Persisted across a reload: bare host normalized to https://, SMS stays on.
  await page.reload();
  await expect(page.getByRole("textbox", { name: /Full name/ })).toHaveValue("Jordan Diaz QA");
  await expect(page.getByRole("textbox", { name: "Website" })).toHaveValue("https://diazgroup.com");
  await expect(page.getByRole("checkbox", { name: "SMS" })).toBeChecked();
});

test("Full name is required — empty submit is blocked with a message", async ({ page }) => {
  await page.goto("/partner/profile");
  await page.getByRole("textbox", { name: /Full name/ }).fill("");
  await page.getByRole("button", { name: "Save Changes" }).click();

  await expect(page.getByText("Full name is required")).toBeVisible();
  // No save happened — still on the profile page.
  await expect(page).toHaveURL(/\/partner\/profile$/);
});
