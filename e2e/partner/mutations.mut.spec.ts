import { test, expect } from "@playwright/test";
import { reseed } from "../reseed";

/**
 * Partner — MUTATING flows. Runs in the `partner-mutations` project (last,
 * after admin-mutations). Serial + reseed after each test for a clean baseline;
 * the reseed re-links the partner auth user by fixed id, so the saved session
 * stays valid.
 */
test.describe.configure({ mode: "serial", timeout: 120_000 });
test.afterEach(() => reseed());

test("a partner can refer a new contact (PP-03)", async ({ page }) => {
  await page.goto("/partner");
  await page.getByRole("button", { name: "Refer a contact" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Contact name/).fill("QA Prospect");
  // referContactSchema requires a contact method — a phone (or email) is mandatory.
  await dialog.getByLabel("Phone", { exact: true }).fill("555-0100");
  await dialog.getByLabel("Company", { exact: true }).fill("QA Co");
  await dialog.getByRole("button", { name: "Submit referral" }).click();

  await expect(page.getByText("Referral submitted")).toBeVisible();
  // The new referral shows up in Jordan's own list.
  await expect(page.getByRole("row", { name: /QA Prospect/ })).toBeVisible();
});
