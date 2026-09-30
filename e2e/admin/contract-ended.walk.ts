import { test, expect } from "@playwright/test";
import { REFERRALS } from "../constants";
import { kpi, openRow } from "../helpers";

/**
 * Walkthrough recording for the REF-12b contract-ended fix (qa-run §5b).
 *
 * This is a `.walk.ts` file: the normal suite (testMatch `*.spec.ts`) never runs
 * it — only the `walkthrough-*` projects do, when armed with `WALKTHROUGH=1`:
 *
 *   WALKTHROUGH=1 pnpm exec playwright test --project=walkthrough-admin \
 *     e2e/admin/contract-ended.walk.ts
 *
 * Unlike `mutations.mut.spec.ts`, it has NO `afterEach` reseed, so the recorded
 * clip stops the moment the flow ends (the reseed there added ~40s of the browser
 * idling on the last frame). It mutates `contractEndedAt` (marks the referral
 * ended) and does NOT reopen on-camera — reseed off-camera afterward to restore.
 */
test("Contract-ended window flips the same day (REF-12b)", async ({ page }) => {
  await test.step("Open an active referral", async () => {
    await page.goto("/admin/referrals");
    await openRow(page, REFERRALS.active.name, "**/admin/referrals/**"); // Dr. Helen Park
    await expect(page.getByText(/Commission window open through/)).toBeVisible();
  });

  await test.step("Mark the contract ended (dialog defaults to today)", async () => {
    await page.getByRole("button", { name: "Mark contract ended" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("Mark contract ended?");
    await dialog.getByRole("button", { name: "Mark contract ended" }).click();
    await expect(page.getByText("Contract marked as ended")).toBeVisible();
  });

  await test.step("Window flips to closed the same day; earned is retained", async () => {
    await expect(page.getByText(/Commission window closed early/)).toBeVisible();
    await expect(page.getByText(/Commission window open through/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Reopen contract" })).toBeVisible();
    await expect(kpi(page, "Commission earned")).toContainText(REFERRALS.active.commissionEarned); // $870 kept
  });
});
