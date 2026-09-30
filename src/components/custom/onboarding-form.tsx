"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { applyToJoinAction, completeOnboardingAction } from "@/app/actions/onboarding";
import type { InvitePrefill } from "@/lib/services/invite-service";
import { applyToJoinSchema, type ApplyToJoinFormData } from "@/lib/validations/partner";
import { formatUsPhone } from "@/lib/validations/phone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

/** Uppercase section heading, matching the prototype's onboarding layout. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

const INVITED_HOW_DID_YOU_HEAR = "Invited by Clara Central";

/**
 * Shared partner onboarding form, used by two entry paths:
 * - `invite` — `/invite/[token]`: email + "how did you hear" are locked (prefilled
 *   from the invite); submit auto-creates the (already-approved) account and
 *   redirects into the portal via `completeOnboardingAction`.
 * - `apply` — `/apply` (public self-registration): email + "how did you hear" are
 *   editable; submit creates a `pending` application via `applyToJoinAction` and
 *   calls `onApplied()` so the page can show the "Application received" screen.
 *
 * Both modes validate with `applyToJoinSchema` (the invited prefills satisfy it).
 */
export function OnboardingForm({
  mode,
  token,
  prefill,
  onApplied,
}: {
  mode: "invite" | "apply";
  /** Required in `invite` mode. */
  token?: string;
  /** Provided in `invite` mode. */
  prefill?: InvitePrefill;
  /** Called after a successful `apply` submission. */
  onApplied?: () => void;
}) {
  const isInvite = mode === "invite";
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<ApplyToJoinFormData>({
    resolver: zodResolver(applyToJoinSchema),
    defaultValues: {
      fullName: prefill?.fullName ?? "",
      email: prefill?.email ?? "",
      phone: "",
      companyName: prefill?.companyName ?? "",
      role: "",
      location: prefill?.location ?? "",
      website: prefill?.website ?? "",
      howDidYouHear: isInvite ? INVITED_HOW_DID_YOU_HEAR : "",
      typesOfReferrals: "",
      agreeTerms: false,
      agreePrivacy: false,
    },
  });

  const onSubmit = async (values: ApplyToJoinFormData) => {
    setSubmitting(true);
    if (isInvite) {
      // On success the action creates the account and redirects; only failures return.
      const res = await completeOnboardingAction(token!, values);
      if (res?.error) {
        // Duplicate-email conflicts bind inline (under the locked email); others toast.
        if (res.field === "email") {
          form.setError("email", { type: "server", message: res.error });
        } else {
          toast.error(res.error);
        }
        setSubmitting(false);
      }
      return;
    }
    const res = await applyToJoinAction(values);
    if ("error" in res) {
      // A duplicate-email error is shown inline next to the email field; others toast.
      if (res.field === "email") {
        form.setError("email", { type: "server", message: res.error });
      } else {
        toast.error(res.error);
      }
      setSubmitting(false);
      return;
    }
    onApplied?.();
  };

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{isInvite ? "Complete your profile" : "Apply to join"}</CardTitle>
        <CardDescription>
          {isInvite
            ? "You've been invited — complete your profile to get started."
            : "Apply to join the referral program — tell us a bit about yourself."}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* ── About you ── */}
            <div className="space-y-4">
              <SectionLabel>About you</SectionLabel>
              <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full name *</FormLabel>
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
                      <FormLabel>Email address *</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@company.com"
                          disabled={isInvite}
                          className={isInvite ? "bg-muted/50" : undefined}
                          {...field}
                        />
                      </FormControl>
                      {isInvite && <FormDescription>Locked to your invitation.</FormDescription>}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone number</FormLabel>
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
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role / position</FormLabel>
                      <FormControl>
                        <Input placeholder="Founder, Accountant, Advisor…" {...field} />
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
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* ── Your interest ── */}
            <div className="space-y-4">
              <SectionLabel>Your interest</SectionLabel>
              {!isInvite && (
                <FormField
                  control={form.control}
                  name="howDidYouHear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>How did you hear about us?</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. referred by a partner, LinkedIn, conference…"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="typesOfReferrals"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      What types of businesses or contacts would you typically refer to us?
                    </FormLabel>
                    <FormControl>
                      <Textarea rows={4} {...field} />
                    </FormControl>
                    <FormDescription>
                      This helps us understand the kinds of clients you can introduce.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* ── Agreements ── */}
            <div className="space-y-4">
              <SectionLabel>Agreements</SectionLabel>
              <FormField
                control={form.control}
                name="agreeTerms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start gap-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-normal">
                        I have read and agree to the referral program{" "}
                        <Link
                          href="/terms"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline-offset-2 hover:underline"
                        >
                          terms &amp; conditions
                        </Link>
                        . *
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="agreePrivacy"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start gap-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-normal">
                        I consent to my data being processed in line with the privacy policy. *
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {!isInvite && (
              <p className="text-sm text-muted-foreground">
                Your application will be reviewed by a Clara Central admin. You&apos;ll get access
                once approved.
              </p>
            )}

            <div className="flex items-center justify-between pt-2">
              <Link
                href={isInvite ? "/" : "/partner/login"}
                className="text-sm text-muted-foreground hover:text-foreground hover:underline"
              >
                ← Cancel
              </Link>
              <Button type="submit" disabled={submitting}>
                {isInvite
                  ? submitting
                    ? "Setting up…"
                    : "Complete & enter portal"
                  : submitting
                    ? "Submitting…"
                    : "Submit Application"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
