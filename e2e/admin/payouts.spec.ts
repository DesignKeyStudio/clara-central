import { test, expect } from "@playwright/test";
import { PAYOUTS_LIST, PRIVATE_PAYOUT_NOTE } from "../constants";
import { kpi } from "../helpers";

/**
 * Admin — Payouts list (read-only). The admin view DOES show the admin-only
 * "Private note" column — the deliberate counterpart to the partner payouts
 * spec, which proves the same note never leaks partner-side (PP-06).
 */

test.describe("Admin · Payouts", () => {
  test("lists both seeded payouts, the total, and the admin-only private note", async ({ page }) => {
    await page.goto("/admin/payouts");
    await expect(page.getByRole("heading", { name: "Payouts" })).toBeVisible();
    await expect(kpi(page, "Total paid out")).toContainText(PAYOUTS_LIST.totalPaidOut); // $1,950

    await expect(page.getByText("Commission for Orion Logistics close")).toBeVisible();
    await expect(page.getByText("Q2 2026 commission payment")).toBeVisible();

    // The private note is visible to the admin (and must NOT be partner-side).
    await expect(page.getByText(PRIVATE_PAYOUT_NOTE)).toBeVisible();
    await expect(page.getByText("ACH batch payment")).toBeVisible();
  });

  test("search filters payouts by partner name", async ({ page }) => {
    await page.goto("/admin/payouts");
    // The search matches the PARTNER NAME, not the note (see the input's label).
    // "Priya" narrows to her Orion-close payout; Jordan's payout drops out.
    await page.getByLabel("Search payouts by partner name").fill("Priya");

    await expect(page.getByText("Commission for Orion Logistics close")).toBeVisible();
    await expect(page.getByText("Q2 2026 commission payment")).toHaveCount(0);
  });
});
