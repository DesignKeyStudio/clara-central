import { z } from "zod";
import { optionalUrlSchema } from "./url";
import { optionalUsPhoneSchema } from "./phone";
import { amountSchema } from "./amount";
import { personNameSchema } from "./name";

/**
 * Admin "Add invoice" form. `invoiceNumber` is optional — the service
 * auto-generates an `INV-####` number when it's blank. `issuedDate` anchors the
 * commission window (an invoice issued after the window closes earns nothing);
 * `paidDate` is required when the invoice is created as `paid`. Commission accrues
 * only once an invoice is `paid` (domain rule), but the admin can create it in any state.
 */
export const createInvoiceSchema = z
  .object({
    invoiceNumber: z.string().trim().optional(),
    amount: amountSchema,
    status: z.enum(["draft", "sent", "paid"]),
    issuedDate: z.string().min(1, "Issued date is required"),
    paidDate: z.string().optional(),
    publicNote: z.string().trim().optional(),
    privateNote: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "paid" && !data.paidDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["paidDate"],
        message: "Paid date is required when the status is Paid.",
      });
    }
  });

export type CreateInvoiceFormData = z.infer<typeof createInvoiceSchema>;

/**
 * Partner "Refer a contact" form. Contact name plus at least one contact method
 * (email or phone) are required; email and website are format-validated only when
 * present (empty strings are allowed so the optional inputs can stay blank). Free-text
 * fields are capped at 250 characters (business rule).
 */
export const referContactSchema = z
  .object({
    contactName: personNameSchema("Contact name"),
    contactEmail: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
    contactCompany: z.string().trim().max(250, "Keep this under 250 characters").optional(),
    contactPhone: optionalUsPhoneSchema,
    contactWebsite: optionalUrlSchema,
    notes: z.string().trim().max(250, "Keep notes under 250 characters").optional(),
  })
  .superRefine((data, ctx) => {
    const hasEmail = !!data.contactEmail && data.contactEmail.trim().length > 0;
    const hasPhone = !!data.contactPhone && data.contactPhone.trim().length > 0;
    if (!hasEmail && !hasPhone) {
      for (const path of ["contactEmail", "contactPhone"] as const) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [path],
          message: "Provide at least an email or a phone number.",
        });
      }
    }
  });

export type ReferContactFormData = z.infer<typeof referContactSchema>;
