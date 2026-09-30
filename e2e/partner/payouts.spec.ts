import { test, expect } from "@playwright/test";
import { PARTNER, PRIVATE_PAYOUT_NOTE } from "../constants";
import { kpi } from "../helpers";

/**
 * Partner portal — payouts (read-only). The confidentiality crown jewel: the
 * admin-only private note attached to Jordan's payout must NEVER render on his
 * own payouts page. The admin DOES see it (admin/payouts.spec.ts) — this proves
 * it's filtered out partner-side, not merely absent from the seed.
 */

test.describe("Partner · Payouts", () => {
  test("Jordan sees his own payout and correct totals", async ({ page }) => {
    await page.goto("/partner/payouts");
    await expect(page.getByRole("heading", { name: "Payouts" })).toBeVisible();

    await expect(kpi(page, "Total paid out")).toContainText(PARTNER.commissionPaid); // $870
    await expect(kpi(page, "Outstanding balance")).toContainText(PARTNER.commissionOwed); // $0

    // The public note on his one payout is shown.
    await expect(page.getByText("Q2 2026 commission payment")).toBeVisible();
  });

  test("the admin-only private note never leaks to the partner (PP-06)", async ({ page }) => {
    await page.goto("/partner/payouts");
    // The payout itself renders (public note present)…
    await expect(page.getByText("Q2 2026 commission payment")).toBeVisible();
    // …but its admin-only private note must be nowhere on the page.
    await expect(page.getByText(PRIVATE_PAYOUT_NOTE)).toHaveCount(0);
  });
});
