import { type Page, type Locator } from "@playwright/test";

/**
 * The text block of a KpiCard (label + value), located by its exact label, so
 * you can assert the value with `toContainText`:
 *
 *   await expect(kpi(page, "Commission owed")).toContainText("$0");
 *
 * `getByText(label, { exact: true })` matches the label <p>; `..` climbs to the
 * card's text block, which also holds the value <p>. The label must be UNIQUE
 * on the page — avoid labels that also appear in the sidebar nav or in status
 * badges (e.g. "Referrals", "Approved", "Pending"); pick a distinct KPI instead.
 */
export function kpi(page: Page, label: string): Locator {
  return page.getByText(label, { exact: true }).locator("..");
}

/**
 * Click the data-table row containing `text` and wait until the URL matches
 * `urlGlob` (the row's onRowClick navigates to a detail page). Matches the row
 * by its accessible name, which is the concatenation of its cell text.
 */
export async function openRow(page: Page, text: string | RegExp, urlGlob: string): Promise<void> {
  await page.getByRole("row", { name: text }).click();
  await page.waitForURL(urlGlob);
}
