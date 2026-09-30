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
import { useCreateReferral } from "@/lib/queries/hooks";
import { referContactSchema, type ReferContactFormData } from "@/lib/validations/referral";
import { formatUsPhone } from "@/lib/validations/phone";

const DEFAULTS: ReferContactFormData = {
  contactName: "",
  contactEmail: "",
  contactCompany: "",
  contactPhone: "",
  contactWebsite: "",
  notes: "",
};

export function ReferContactDialog({
  commissionRate,
  open,
  onOpenChange,
}: {
  /** The partner's rate (%), shown in the footer note. */
  commissionRate: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateReferral();
  const form = useForm<ReferContactFormData>({
    resolver: zodResolver(referContactSchema),
    defaultValues: DEFAULTS,
  });

  const close = (next: boolean) => {
    if (!next) form.reset(DEFAULTS);
    onOpenChange(next);
  };

  const onSubmit = (values: ReferContactFormData) => {
    create.mutate(values, {
      onSuccess: () => {
        toast.success("Referral submitted");
        close(false);
      },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Refer a contact</DialogTitle>
          <DialogDescription>Introduce a new prospect to Clara Central.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Jane Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="name@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactCompany"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Cedar & Pine Cafe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone *</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        inputMode="tel"
                        placeholder="(555) 555-5555"
                        {...field}
                        onChange={(e) => field.onChange(formatUsPhone(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactWebsite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              * Provide at least an email or phone number.
            </p>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Context that helps our team — needs, timing, how you know them."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Context that helps our team — needs, timing, how you know them.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center gap-2 rounded-md border border-success/20 bg-success/5 px-3 py-2.5 text-sm text-success">
              <Receipt className="size-4 shrink-0" />
              <span>
                Your commission rate: <strong>{commissionRate ?? "—"}%</strong> applied to paid
                invoices for this referral.
              </span>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Submitting…" : "Submit referral"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
