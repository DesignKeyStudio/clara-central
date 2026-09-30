import { test, expect } from "@playwright/test";
import { REFERRALS } from "../constants";
import { kpi, openRow } from "../helpers";

/**
 * Partner portal — referral detail (read-only). Completes the partner main flow
 * (sign in → dashboard → open a referral → see its invoices & commission): opens
 * one of Jordan's referrals from his dashboard and asserts the commission window
 * + per-invoice commission render, and that the partner view stays read-only —
 * none of the admin's Add-invoice / Record-payment controls leak in.
 */

test.describe("Partner · Referral detail", () => {
  test("open a referral: window, KPIs, and per-invoice commission", async ({ page }) => {
    await page.goto("/partner");
    await openRow(page, /Dr\. Helen Park/, "**/partner/referrals/**");

    await expect(page.getByRole("heading", { name: REFERRALS.active.name })).toBeVisible();
    // r1's window is OPEN (active) — commission still accrues.
    await expect(page.getByText(/Commission window open through/)).toBeVisible();

    await expect(kpi(page, "Total invoices")).toContainText(REFERRALS.active.invoices); // 3
    await expect(kpi(page, "Commission earned")).toContainText(REFERRALS.active.commissionEarned); // $870

    // A paid invoice shows its commission: seeded INV-2041 ($4,500 @ 12%) → $540.
    await expect(page.getByText("INV-2041")).toBeVisible();
    await expect(page.getByText("$540")).toBeVisible();
  });

  test("the partner view is read-only — no admin invoice/payment controls", async ({ page }) => {
    await page.goto("/partner");
    await openRow(page, /Dr\. Helen Park/, "**/partner/referrals/**");

    // These exist only on the admin referral detail; a partner must never see them.
    await expect(page.getByRole("button", { name: "Add invoice" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Record payment" })).toHaveCount(0);
  });
});
