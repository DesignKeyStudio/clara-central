import { test, expect } from "@playwright/test";
import { REFERRALS } from "../constants";
import { kpi } from "../helpers";

/**
 * Admin — Referral detail (read-only). The window-rule trio that proves the
 * commission engine: an OPEN window accrues, while EXPIRED / contract-ENDED
 * windows gate *new* invoices but never strip already-earned commission. If a
 * refactor breaks that distinction, these fail.
 *
 * Referral ids aren't stable across seeds, so each test navigates by searching
 * the referrals list and clicking the matching row.
 */

/** Search the referrals list for `term` and open the single matching row. */
async function openReferral(page: import("@playwright/test").Page, term: string, rowName: RegExp) {
  await page.goto("/admin/referrals");
  await page.getByLabel("Search referrals").fill(term);
  await page.getByRole("row", { name: rowName }).click();
  await page.waitForURL("**/admin/referrals/**");
}

test.describe("Admin · Referral detail · commission window", () => {
  test("OPEN window: commission accrues and invoices show their commission", async ({ page }) => {
    await openReferral(page, "Helen", /Helen Park/);

    await expect(page.getByRole("heading", { name: REFERRALS.active.name })).toBeVisible();
    await expect(page.getByText(/Commission window open through/)).toBeVisible();

    await expect(kpi(page, "Commission earned")).toContainText(REFERRALS.active.commissionEarned); // $870
    await expect(kpi(page, "Total invoices")).toContainText(REFERRALS.active.invoices); // 3

    // INV-2041 ($4,500 paid @ 12%) → $540 commission.
    await expect(page.getByText("INV-2041")).toBeVisible();
    await expect(page.getByText("$540")).toBeVisible();
  });

  test("contract ENDED early: window closed, reopen offered, earned commission kept", async ({
    page,
  }) => {
    await openReferral(page, "Orion", /Orion Logistics/);

    await expect(page.getByText(/Commission window closed early/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Reopen contract" })).toBeVisible();
    await expect(kpi(page, "Commission earned")).toContainText(REFERRALS.ended.commissionEarned); // $1,080
  });

  test("EXPIRED window still counts its historical paid invoice", async ({ page }) => {
    await openReferral(page, "Lakeside", /Lakeside Property Mgmt/);

    // Expired wording is "… months AFTER the referral date" (vs. "from" when open).
    await expect(page.getByText(/months after the referral date/)).toBeVisible();
    await expect(kpi(page, "Commission earned")).toContainText(REFERRALS.expired.commissionEarned); // $500
    await expect(kpi(page, "Total invoices")).toContainText(REFERRALS.expired.invoices); // 1
  });
});
