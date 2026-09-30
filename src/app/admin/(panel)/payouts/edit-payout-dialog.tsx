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
import { usePartner, useUpdatePayout } from "@/lib/queries/hooks";
import type { PayoutListRow } from "@/lib/services/payout-service";
import { recordPayoutSchema, type RecordPayoutFormData } from "@/lib/validations/payout";
import { formatCurrency } from "@/lib/utils";

const valuesFor = (payout: PayoutListRow): RecordPayoutFormData => ({
  amount: payout.amount,
  publicNote: payout.noteToPartner,
  privateNote: payout.privateNote,
});

export function EditPayoutDialog({
  payout,
  open,
  onOpenChange,
}: {
  payout: PayoutListRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const update = useUpdatePayout(payout.partnerId, payout.referralId);
  // Only fetch the partner while the dialog is open (avoids a request per table row).
  const { data: partner } = usePartner(payout.partnerId, { enabled: open });
  const form = useForm<RecordPayoutFormData>({
    resolver: zodResolver(recordPayoutSchema),
    defaultValues: valuesFor(payout),
  });

  useEffect(() => {
    if (open) form.reset(valuesFor(payout));
  }, [open, payout, form]);

  const amount = Number(form.watch("amount")) || 0;
  // The partner's current owed already excludes this payout's existing amount, so the
  // baseline available for THIS payout adds it back. Over-paying is allowed (no server
  // cap); we just warn the outstanding balance will go negative.
  const baseline = partner ? Math.round((partner.commissionOwed + payout.amount) * 100) / 100 : null;
  const overLimit = baseline != null && amount > baseline;

  const onSubmit = (values: RecordPayoutFormData) => {
    update.mutate(
      { payoutId: payout.id, input: values },
      {
        onSuccess: () => {
          toast.success("Payout updated");
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
          <DialogTitle>Edit payout</DialogTitle>
          <DialogDescription>Commission payout to {payout.partnerName}.</DialogDescription>
        </DialogHeader>

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
                  {baseline != null &&
                    (overLimit ? (
                      <p className="text-sm text-warning">
                        This is more than the {formatCurrency(baseline)} available — the outstanding
                        balance will go negative.
                      </p>
                    ) : (
                      <FormDescription>
                        Available to pay out: {formatCurrency(baseline)}.
                      </FormDescription>
                    ))}
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
              <Button type="submit" disabled={update.isPending || amount <= 0}>
                {update.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
