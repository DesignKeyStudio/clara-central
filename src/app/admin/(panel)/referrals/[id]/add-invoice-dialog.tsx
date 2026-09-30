"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Receipt } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAddInvoice } from "@/lib/queries/hooks";
import type { ReferralDetail } from "@/lib/services/referral-service";
import { invoiceStatusMeta } from "@/lib/status-meta";
import { DatePicker } from "@/components/custom/date-picker";
import { formatCurrency, todayLocalDate } from "@/lib/utils";
import { createInvoiceSchema, type CreateInvoiceFormData } from "@/lib/validations/referral";

// Local YYYY-MM-DD — NOT `toISOString().slice(0,10)`, which is the UTC date and
// would default the issued date a day ahead for users west of UTC.
const todayStr = todayLocalDate;

const makeDefaults = () => ({
  invoiceNumber: "",
  amount: undefined,
  status: "draft" as const,
  issuedDate: todayStr(),
  paidDate: "",
  publicNote: "",
  privateNote: "",
});

export function AddInvoiceDialog({
  referral,
  open,
  onOpenChange,
}: {
  referral: ReferralDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const add = useAddInvoice(referral.id, referral.partnerId);
  const form = useForm<CreateInvoiceFormData>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: makeDefaults(),
  });

  const amount = Number(form.watch("amount")) || 0;
  const status = form.watch("status");
  const windowOpen = referral.commissionState === "active";
  const previewCommission = (amount * referral.commissionRate) / 100;

  const close = (next: boolean) => {
    if (!next) form.reset(makeDefaults());
    onOpenChange(next);
  };

  const onSubmit = (values: CreateInvoiceFormData) => {
    add.mutate(values, {
      onSuccess: () => {
        toast.success("Invoice added");
        close(false);
      },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add invoice</DialogTitle>
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
                    <Input placeholder="e.g. INV-3001" {...field} />
                  </FormControl>
                  <FormDescription>Leave blank to auto-generate.</FormDescription>
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

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">{invoiceStatusMeta("draft").label}</SelectItem>
                        <SelectItem value="sent">{invoiceStatusMeta("sent").label}</SelectItem>
                        <SelectItem value="paid">{invoiceStatusMeta("paid").label}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <Button type="button" variant="outline" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={add.isPending}>
                {add.isPending ? "Adding…" : "Add Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
