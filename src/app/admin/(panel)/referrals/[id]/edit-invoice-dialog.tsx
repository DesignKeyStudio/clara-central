"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Info, Receipt } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/custom/date-picker";
import { StatusBadge } from "@/components/custom/status-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useUpdateInvoice } from "@/lib/queries/hooks";
import type { ReferralDetail, ReferralInvoiceRow } from "@/lib/services/referral-service";
import { invoiceStatusMeta } from "@/lib/status-meta";
import { formatCurrency } from "@/lib/utils";
import { createInvoiceSchema, type CreateInvoiceFormData } from "@/lib/validations/referral";

const valuesFor = (invoice: ReferralInvoiceRow): CreateInvoiceFormData => ({
  invoiceNumber: invoice.id,
  amount: invoice.amount,
  status: invoice.status,
  issuedDate: invoice.addedAt,
  paidDate: invoice.paidDate ?? "",
  publicNote: invoice.publicNote ?? "",
  privateNote: invoice.privateNote ?? "",
});

export function EditInvoiceDialog({
  referral,
  invoice,
  open,
  onOpenChange,
}: {
  referral: ReferralDetail;
  invoice: ReferralInvoiceRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const update = useUpdateInvoice(referral.id, referral.partnerId);
  const form = useForm<CreateInvoiceFormData>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: valuesFor(invoice),
  });

  // Re-seed the form whenever a different invoice is opened for editing.
  useEffect(() => {
    if (open) form.reset(valuesFor(invoice));
  }, [open, invoice, form]);

  const amount = Number(form.watch("amount")) || 0;
  const status = form.watch("status");
  const windowOpen = referral.commissionState === "active";
  const previewCommission = (amount * referral.commissionRate) / 100;

  const onSubmit = (values: CreateInvoiceFormData) => {
    update.mutate(
      { invoiceId: invoice.invoiceId, input: values },
      {
        onSuccess: () => {
          toast.success("Invoice updated");
          onOpenChange(false);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit invoice</DialogTitle>
          <DialogDescription>Client invoice for {referral.contactName}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="invoiceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice ID</FormLabel>
                  <FormControl>
                    <Input disabled className="bg-muted/50" {...field} />
                  </FormControl>
                  <FormDescription>Invoice number can&apos;t be changed.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount *</FormLabel>
                  <FormControl>
                    <div className="flex items-stretch">
                      <span className="inline-flex items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        min={0.01}
                        max={100000000}
                        step="0.01"
                        placeholder="0"
                        className="rounded-l-none"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid items-start gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <p className="text-sm font-normal leading-none">Status</p>
                <div className="flex items-center gap-1.5">
                  <StatusBadge {...invoiceStatusMeta(invoice.status)} />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="How to change status"
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Info className="size-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Change status from the invoice row.</TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <FormField
                control={form.control}
                name="issuedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issued date *</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {status === "paid" && (
                <FormField
                  control={form.control}
                  name="paidDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paid date *</FormLabel>
                      <FormControl>
                        <DatePicker value={field.value} onChange={field.onChange} clearable />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="publicNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note to partner</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="e.g. April retainer — payroll add-on included."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Visible to the referrer alongside this invoice.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="privateNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Private note</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Internal reminder about this invoice…" {...field} />
                  </FormControl>
                  <FormDescription>Internal — only visible to admins.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {amount > 0 && (
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2.5 text-sm">
                <Receipt className="size-4 shrink-0 text-muted-foreground" />
                {windowOpen ? (
                  <span>
                    Commission on this invoice: <strong>{formatCurrency(previewCommission)}</strong> (
                    {referral.commissionRate}% of {formatCurrency(amount)})
                    {status !== "paid" && (
                      <span className="text-muted-foreground"> — earns when paid</span>
                    )}
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    No commission will accrue — the commission window for this referral is closed.
                  </span>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
