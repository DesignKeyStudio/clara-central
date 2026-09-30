"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { Copy, Mail } from "lucide-react";
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
import { useAppConfig, useInvitePartner } from "@/lib/queries/hooks";
import { invitePartnerSchema, type InvitePartnerFormData } from "@/lib/validations/partner";

const DEFAULTS: InvitePartnerFormData = {
  fullName: "",
  email: "",
  companyName: "",
  location: "",
  website: "",
  commissionRate: 10,
};

type Sent = { link: string; email: string; emailed: boolean; expiresAt: string | null };

export function InvitePartnerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const invite = useInvitePartner();
  const { data: config } = useAppConfig();
  const [sent, setSent] = useState<Sent | null>(null);
  const form = useForm<InvitePartnerFormData>({
    resolver: zodResolver(invitePartnerSchema),
    defaultValues: DEFAULTS,
  });

  // Prefill the commission rate from the system standard whenever the dialog opens.
  // (`sent` is already cleared on close, so no setState is needed here.)
  useEffect(() => {
    if (open) {
      form.reset({
        ...DEFAULTS,
        commissionRate: config?.standardCommissionRate ?? DEFAULTS.commissionRate,
      });
    }
  }, [open, config?.standardCommissionRate, form]);

  // Reset both the form and the "sent" view whenever the dialog closes.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      form.reset(DEFAULTS);
      setSent(null);
    }
    onOpenChange(next);
  };

  const onSubmit = (values: InvitePartnerFormData) => {
    invite.mutate(values, {
      onSuccess: (res) => setSent(res),
      onError: (e) => toast.error(e.message),
    });
  };

  const copyLink = async () => {
    if (!sent) return;
    try {
      await navigator.clipboard.writeText(sent.link);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy — select and copy the link manually.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {sent ? (
          <>
            <DialogHeader>
              <DialogTitle>{sent.emailed ? "Invitation sent" : "Invitation created"}</DialogTitle>
              <DialogDescription>
                {sent.emailed
                  ? `We emailed an invitation to ${sent.email}. You can also share the link below directly.`
                  : `We couldn't send the email automatically — share the link below with ${sent.email} to invite them.`}
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-2">
              <Input readOnly value={sent.link} aria-label="Invitation link" className="flex-1" />
              <Button type="button" variant="outline" onClick={copyLink}>
                <Copy className="size-4" />
                Copy Link
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {sent.expiresAt
                ? `This invite expires on ${format(parseISO(sent.expiresAt), "MMM d, yyyy")}. `
                : ""}
              The partner&apos;s email address will be locked and cannot be changed during
              onboarding.
            </p>

            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Invite a partner</DialogTitle>
              <DialogDescription>
                Send an invitation email and generate an onboarding link.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full name</FormLabel>
                      <FormControl>
                        <Input placeholder="Jamie Rivera" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company / organization</FormLabel>
                        <FormControl>
                          <Input placeholder="Rivera Consulting" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="Austin, TX" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem className="self-start">
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="commissionRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Commission rate (%) *</FormLabel>
                        <FormControl>
                          <Input type="number" min={0.01} max={100} step="0.01" {...field} />
                        </FormControl>
                        <FormDescription>
                          Starting rate for this partner — snapshotted onto each referral they
                          submit.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={invite.isPending}>
                    <Mail className="size-4" />
                    {invite.isPending ? "Sending…" : "Send Invitation"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
