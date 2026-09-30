"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
import { useRecordPayout } from "@/lib/queries/hooks";
import type { ReferralDetail } from "@/lib/services/referral-service";
import { recordPayoutSchema, type RecordPayoutFormData } from "@/lib/validations/payout";
import { cn, formatCurrency } from "@/lib/utils";

const DEFAULTS = {
  amount: undefined,
  publicNote: "",
  privateNote: "",
};

/** A small earned / paid / owed stat box above the form. */
function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className={cn(
        "flex-1 rounded-lg border p-3",
        highlight ? "border-primary/30 bg-primary/5" : "bg-muted/40",
      )}
    >
      <p className={cn("text-xs font-medium", highlight ? "text-primary" : "text-muted-foreground")}>
        {label}
      </p>
      <p className={cn("mt-0.5 text-lg font-bold tabular-nums", highlight && "text-primary")}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}

export function RecordPaymentDialog({
  referral,
  open,
  onOpenChange,
}: {
  referral: ReferralDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // Owed against this referral's deal: commission earned on its paid invoices,
  // minus payouts already attributed to it.
  const owed = Math.max(0, referral.commissionEarned - referral.commissionPaid);
  const record = useRecordPayout(referral.partnerId, referral.id);
  const form = useForm<RecordPayoutFormData>({
    resolver: zodResolver(recordPayoutSchema),
    defaultValues: DEFAULTS,
  });

  useEffect(() => {
    if (open) form.reset(DEFAULTS);
  }, [open, form]);

  const amount = Number(form.watch("amount")) || 0;
  // Over-paying is allowed (no server cap); we just warn the balance will go negative.
  const overLimit = amount > owed;

  const onSubmit = (values: RecordPayoutFormData) => {
    record.mutate(values, {
      onSuccess: () => {
        toast.success("Payment recorded");
        onOpenChange(false);
      },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
          <DialogDescription>
            Commission payment for {referral.contactName}, paid to {referral.partnerName}.
          </DialogDescription>
        </DialogHeader>

        <div className="mb-5 flex gap-2">
          <Stat label="Earned on this referral" value={referral.commissionEarned} />
          <Stat label="Already paid" value={referral.commissionPaid} />
          <Stat label="Available to pay out" value={owed} highlight />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                  {overLimit ? (
                    <p className="text-sm text-warning">
                      This is more than the {formatCurrency(owed)} available — the outstanding balance
                      will go negative.
                    </p>
                  ) : (
                    <FormDescription>Available to pay out: {formatCurrency(owed)}.</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="publicNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note to partner</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="e.g. Q2 2026 commission payment" {...field} />
                  </FormControl>
                  <FormDescription>Visible to the partner with this payment.</FormDescription>
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
                    <Textarea rows={2} placeholder="Internal transfer reference…" {...field} />
                  </FormControl>
                  <FormDescription>Internal — only visible to admins.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={record.isPending || amount <= 0}>
                {record.isPending ? "Recording…" : "Record Payment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
