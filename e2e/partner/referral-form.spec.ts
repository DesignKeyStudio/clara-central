import { test, expect } from "@playwright/test";

/**
 * Partner portal — "Refer a contact" form validation (read-only: each submit is
 * blocked client-side, so nothing is written to the DB). Guards two rules the
 * 2026-06-12 partner-portal QA run surfaced:
 *
 *  - A contact method is required — `referContactSchema` rejects a referral with
 *    neither email nor phone (the same message is attached to both fields).
 *  - The form owns its validation (`<form noValidate>`), so the themed Zod
 *    "Enter a valid email" inline error surfaces. Without `noValidate` the
 *    browser's native `type="email"` check fired first and swallowed the submit,
 *    masking the app's own error (the bug fixed alongside this spec).
 */

test.describe("Partner · Refer a contact — validation", () => {
  test("blocks submit when neither email nor phone is given", async ({ page }) => {
    await page.goto("/partner");
    await page.getByRole("button", { name: "Refer a contact" }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/Contact name/).fill("No Contact Method");
    await dialog.getByRole("button", { name: "Submit referral" }).click();

    // The contact-method rule fires; the dialog stays open and no toast appears.
    await expect(
      dialog.getByText("Provide at least an email or a phone number.").first(),
    ).toBeVisible();
    await expect(page.getByText("Referral submitted")).toHaveCount(0);
    await expect(dialog).toBeVisible();
  });

  test("shows the themed invalid-email error, not a native browser bubble", async ({ page }) => {
    await page.goto("/partner");
    await page.getByRole("button", { name: "Refer a contact" }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/Contact name/).fill("Bad Email");
    // A phone satisfies the email-or-phone rule, isolating the email-format error.
    await dialog.getByLabel("Phone", { exact: true }).fill("555-0100");
    await dialog.getByLabel("Email", { exact: true }).fill("not-an-email");
    await dialog.getByRole("button", { name: "Submit referral" }).click();

    // With `noValidate`, RHF/Zod renders the inline message (native validation
    // would have shown its own bubble and prevented the submit entirely).
    await expect(dialog.getByText("Enter a valid email")).toBeVisible();
    await expect(page.getByText("Referral submitted")).toHaveCount(0);
  });
});
