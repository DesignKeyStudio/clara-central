import { test, expect } from "@playwright/test";
import { PARTNER_PENDING, REFERRALS } from "../constants";
import { kpi, openRow } from "../helpers";
import { reseed } from "../reseed";

/**
 * Admin — MUTATING flows (write to the DB). Runs in the `admin-mutations`
 * project, which depends on every read-only project, so those assert against
 * pristine seed data first.
 *
 * Isolation: serial + a reseed after EVERY test, so each case starts from a
 * clean, known baseline and order doesn't matter. This automates the
 * TEST-PLAN's per-case "🔁 reseed afterward" discipline. The reseed re-links the
 * auth users by fixed id, so the saved admin session stays valid.
 */
test.describe.configure({ mode: "serial", timeout: 120_000 });
test.afterEach(() => reseed());

test("approve a pending self-signup partner (PART-12)", async ({ page }) => {
  await page.goto("/admin/partners");

  // The pending applicant lives in the "Pending applications" section above the list.
  const pending = page.getByRole("region", { name: "Pending applications" });
  await expect(pending.getByText(PARTNER_PENDING.fullName)).toBeVisible();

  // Inline row action → confirmation AlertDialog → confirm.
  await pending.getByRole("button", { name: "Approve" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Approve" }).click();

  await expect(page.getByText("Partner approved.")).toBeVisible();
  // She was the only pending applicant → the section disappears and she moves
  // into the main (approved) list.
  await expect(page.getByRole("region", { name: "Pending applications" })).toHaveCount(0);
  await expect(page.getByText(PARTNER_PENDING.fullName)).toBeVisible();
});

test("decline a pending partner hides them; Show rejected reveals them (PART-13)", async ({
  page,
}) => {
  await page.goto("/admin/partners");

  const pending = page.getByRole("region", { name: "Pending applications" });
  await pending.getByRole("button", { name: "Decline" }).click();

  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText(`Decline ${PARTNER_PENDING.fullName}?`);
  await dialog.getByRole("button", { name: "Decline" }).click();

  await expect(page.getByText("Partner declined.")).toBeVisible();
  // Hidden from the default (approved) list and the pending section is gone.
  await expect(page.getByRole("region", { name: "Pending applications" })).toHaveCount(0);
  await expect(page.getByText(PARTNER_PENDING.fullName)).toHaveCount(0);

  // "Show rejected" surfaces her as the (only) rejected partner.
  await page.getByRole("checkbox", { name: "Show rejected" }).check();
  await expect(page.getByText(PARTNER_PENDING.fullName)).toBeVisible();
});

test("editing a partner's rate re-derives their commission (PART-09)", async ({ page }) => {
  await page.goto("/admin/partners");
  await openRow(page, /Jordan Diaz/, "**/admin/partners/**");

  await page.getByRole("button", { name: "Edit partner" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Commission rate (%)").fill("15");
  await dialog.getByRole("button", { name: "Save changes" }).click();

  await expect(page.getByText("Partner updated")).toBeVisible();
  // $7,250 of paid invoices × 15% = $1,087.50 → rounded to $1,088.
  await expect(kpi(page, "Commission earned")).toContainText("$1,088");
});

test("recording a payout warns past the owed amount, then records (PART-10)", async ({ page }) => {
  await page.goto("/admin/partners");
  await openRow(page, /Liam Walsh/, "**/admin/partners/**");

  await page.getByRole("button", { name: "Record payout" }).click();
  const dialog = page.getByRole("dialog");

  // Over the $3,270 owed → warning (but submit stays enabled; no server cap).
  await dialog.getByLabel(/Amount/).fill("5000");
  await expect(dialog.getByText(/the outstanding balance will go negative/)).toBeVisible();

  // A valid partial payout records and re-derives paid/owed.
  await dialog.getByLabel(/Amount/).fill("1000");
  await dialog.getByRole("button", { name: "Record payout" }).click();

  await expect(page.getByText("Payout recorded")).toBeVisible();
  await expect(kpi(page, "Commission paid")).toContainText("$1,000");
  await expect(kpi(page, "Commission owed")).toContainText("$2,270"); // 3,270 − 1,000
});

test("adding a paid invoice raises the referral's commission (REF-09)", async ({ page }) => {
  await page.goto("/admin/referrals");
  await openRow(page, /Dr\. Helen Park/, "**/admin/referrals/**");

  await page.getByRole("button", { name: "Add invoice" }).click();
  const dialog = page.getByRole("dialog");

  await dialog.getByLabel(/Amount/).fill("1000");
  // Live commission preview: 12% of $1,000 = $120.
  await expect(dialog.getByText(/Commission on this invoice/)).toContainText("$120");

  // Mark it Paid (so it accrues) and give it a valid paid date (≥ issued date).
  await dialog.getByLabel("Status", { exact: true }).click();
  await page.getByRole("option", { name: "Paid" }).click();
  const issued = await dialog.getByLabel(/Issued date/).inputValue();
  await dialog.getByLabel(/Paid date/).fill(issued);

  await dialog.getByRole("button", { name: "Add invoice" }).click();

  await expect(page.getByText("Invoice added")).toBeVisible();
  await expect(kpi(page, "Commission earned")).toContainText("$990"); // 870 + 120
});

test("changing the pipeline status persists (REF-08)", async ({ page }) => {
  await page.goto("/admin/referrals");
  await openRow(page, /Tara Nguyen/, "**/admin/referrals/**");

  await page.getByRole("button", { name: "Change referral status" }).click();
  await page.getByRole("menuitem", { name: "Meeting scheduled" }).click();

  await expect(page.getByText("Status updated")).toBeVisible();
  await expect(page.getByText("Meeting scheduled").first()).toBeVisible();
});

test("reopening an ended contract re-opens the commission window (REF-12)", async ({ page }) => {
  await page.goto("/admin/referrals");
  await openRow(page, /Orion Logistics/, "**/admin/referrals/**");

  await page.getByRole("button", { name: "Reopen contract" }).click();

  await expect(page.getByText("Contract reopened")).toBeVisible();
  // The toggle now offers the inverse action — the window is open again.
  await expect(page.getByRole("button", { name: "Mark contract ended" })).toBeVisible();
});

test("marking an active contract ended closes the window the SAME day (REF-12b)", async ({
  page,
}) => {
  // Regression guard for the contract-ended window bug. REF-12 only exercises the
  // REVERSE direction (reopen) on a referral seeded as already-ended, so it never
  // caught this: `commissionWindow` compared the `now` instant to `contractEndedAt`
  // (a `@db.Date` → UTC midnight), so marking a contract ended TODAY left the
  // window reading "open" until the UTC clock crossed midnight (timezone-dependent),
  // which also hid the Reopen button. The spec requires the display to flip
  // immediately on confirm (commission-engine.md: `contract_ended` ⇔ today ≥ date).
  await page.goto("/admin/referrals");
  await openRow(page, REFERRALS.active.name, "**/admin/referrals/**"); // Dr. Helen Park — active

  await expect(page.getByText(/Commission window open through/)).toBeVisible();
  await expect(kpi(page, "Commission earned")).toContainText(REFERRALS.active.commissionEarned); // $870

  // Mark the contract ended (the dialog sets the end date to today) and confirm.
  await page.getByRole("button", { name: "Mark contract ended" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("Mark contract ended?");
  await dialog.getByRole("button", { name: "Mark contract ended" }).click();

  await expect(page.getByText("Contract marked as ended")).toBeVisible();
  // Window must read CLOSED immediately (the bug left it "open through …").
  await expect(page.getByText(/Commission window closed early/)).toBeVisible();
  await expect(page.getByText(/Commission window open through/)).toHaveCount(0);
  // The Reopen affordance — gated on the contract_ended state — now appears.
  await expect(page.getByRole("button", { name: "Reopen contract" })).toBeVisible();
  // Already-earned commission is retained; the window only gates NEW accrual.
  await expect(kpi(page, "Commission earned")).toContainText(REFERRALS.active.commissionEarned); // $870
});
