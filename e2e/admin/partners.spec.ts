import { test, expect } from "@playwright/test";
import { PARTNER, PARTNER_OWED, PARTNER_PENDING, PARTNERS_LIST } from "../constants";
import { kpi, openRow } from "../helpers";

/**
 * Admin — Partners list & detail (read-only). Runs in the `admin` project,
 * already authenticated via the saved admin session. Asserts the commission
 * figures derived from prisma/seed.ts; if these drift, the math broke.
 */

test.describe("Admin · Partners list", () => {
  test("pending applicant sits in its own section; approved partners fill the list", async ({
    page,
  }) => {
    await page.goto("/admin/partners");
    await expect(page.getByRole("heading", { name: "Partners" })).toBeVisible();

    await expect(kpi(page, "Total partners")).toContainText(PARTNERS_LIST.total);
    await expect(kpi(page, "Total commission paid")).toContainText(
      PARTNERS_LIST.totalCommissionPaid,
    );

    // The pending applicant lives in the "Pending applications" section with
    // Approve/Decline actions — not the main list.
    const pending = page.getByRole("region", { name: "Pending applications" });
    await expect(pending).toBeVisible();
    await expect(pending.getByText(PARTNER_PENDING.fullName)).toBeVisible();
    await expect(pending.getByRole("button", { name: "Approve" })).toBeVisible();
    await expect(pending.getByRole("button", { name: "Decline" })).toBeVisible();

    // The three approved partners fill the main list; the pending one is NOT
    // duplicated there (appears exactly once, in the section above).
    for (const name of [PARTNER.fullName, PARTNER_OWED.fullName, "Priya Shah"]) {
      await expect(page.getByText(name)).toBeVisible();
    }
    await expect(page.getByText(PARTNER_PENDING.fullName)).toHaveCount(1);
  });

  test("search narrows the approved list and clears back", async ({ page }) => {
    await page.goto("/admin/partners");
    await page.getByLabel("Search partners").fill("walsh");

    await expect(page.getByText(PARTNER_OWED.fullName)).toBeVisible();
    await expect(page.getByText(PARTNER.fullName)).toHaveCount(0);

    await page.getByLabel("Search partners").clear();
    await expect(page.getByText(PARTNER.fullName)).toBeVisible();
  });

  test("Show rejected swaps the list to rejected-only (empty on a fresh seed)", async ({ page }) => {
    await page.goto("/admin/partners");
    await expect(page.getByText(PARTNER.fullName)).toBeVisible(); // approved partner shown by default

    await page.getByRole("checkbox", { name: "Show rejected" }).check();
    // A fresh seed has zero rejected partners → approved rows drop out, empty state shows.
    await expect(page.getByText(PARTNER.fullName)).toHaveCount(0);
    await expect(page.getByText("No rejected partners.")).toBeVisible();

    await page.getByRole("checkbox", { name: "Show rejected" }).uncheck();
    await expect(page.getByText(PARTNER.fullName)).toBeVisible();
  });

  test("a partner row carries its rate and commission figures", async ({ page }) => {
    await page.goto("/admin/partners");
    const jordan = page.getByRole("row", { name: /Jordan Diaz/ });
    await expect(jordan).toContainText(PARTNER.rate); // 12%
    await expect(jordan).toContainText(PARTNER.commissionPaid); // $870
  });
});

test.describe("Admin · Partner detail", () => {
  test("Jordan's KPIs derive correctly and a fully-paid partner can't be paid out", async ({
    page,
  }) => {
    await page.goto("/admin/partners");
    await openRow(page, /Jordan Diaz/, "**/admin/partners/**");

    await expect(page.getByRole("heading", { name: PARTNER.fullName })).toBeVisible();
    await expect(kpi(page, "Commission earned")).toContainText(PARTNER.commissionEarned); // $870
    await expect(kpi(page, "Commission paid")).toContainText(PARTNER.commissionPaid); // $870
    await expect(kpi(page, "Commission owed")).toContainText(PARTNER.commissionOwed); // $0

    // Jordan's three referrals — and only those — are listed.
    for (const contact of PARTNER.referrals) {
      await expect(page.getByText(contact)).toBeVisible();
    }

    // Owed $0 → "Record payout" is disabled (PART-07).
    await expect(page.getByRole("button", { name: "Record payout" })).toBeDisabled();
  });

  test("Liam shows owed commission and an enabled payout button", async ({ page }) => {
    await page.goto("/admin/partners");
    await openRow(page, /Liam Walsh/, "**/admin/partners/**");

    await expect(page.getByRole("heading", { name: PARTNER_OWED.fullName })).toBeVisible();
    await expect(kpi(page, "Commission earned")).toContainText(PARTNER_OWED.commissionEarned); // $3,270
    await expect(kpi(page, "Commission paid")).toContainText(PARTNER_OWED.commissionPaid); // $0
    await expect(kpi(page, "Commission owed")).toContainText(PARTNER_OWED.commissionOwed); // $3,270

    await expect(page.getByRole("button", { name: "Record payout" })).toBeEnabled();
  });
});
