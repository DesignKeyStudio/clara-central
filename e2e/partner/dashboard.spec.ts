import { test, expect } from "@playwright/test";
import { PARTNER } from "../constants";
import { kpi } from "../helpers";

/**
 * Partner portal — dashboard (read-only). Runs as Jordan via the saved partner
 * session. Asserts Jordan's own commission figures and that per-referral totals
 * derive correctly from his paid invoices.
 */

test.describe("Partner · My Referrals", () => {
  test("dashboard shows Jordan's rate and KPIs", async ({ page }) => {
    await page.goto("/partner");
    await expect(page.getByRole("heading", { name: "My Referrals" })).toBeVisible();
    await expect(page.getByText(PARTNER.rate)).toBeVisible(); // commission rate 12%

    await expect(kpi(page, "Total referrals")).toContainText(PARTNER.referralCount); // 3
    await expect(kpi(page, "Total commission earned")).toContainText(PARTNER.commissionEarned); // $870
    await expect(kpi(page, "Total paid out")).toContainText(PARTNER.commissionPaid); // $870
  });

  test("per-referral commission totals: a closed deal earns, an un-paid one doesn't", async ({
    page,
  }) => {
    await page.goto("/partner");
    // Dr. Helen Park (deal closed, paid invoices) → $870.
    await expect(page.getByRole("row", { name: /Dr\. Helen Park/ })).toContainText("$870");
    // Tara Nguyen (contacted, no invoices) → no commission figure at all.
    await expect(page.getByRole("row", { name: /Tara Nguyen/ })).not.toContainText("$");
  });

  test("status filter narrows to the closed deal", async ({ page }) => {
    await page.goto("/partner");
    await page.getByLabel("Filter by status").click();
    // The status filter is a DropdownMenu of checkbox items (role menuitemcheckbox),
    // not a Select listbox — so its entries are menuitemcheckbox, not option.
    await page.getByRole("menuitemcheckbox", { name: "Deal closed" }).click();

    await expect(page.getByText("Dr. Helen Park")).toBeVisible();
    await expect(page.getByText("Tara Nguyen")).toHaveCount(0);
  });
});
