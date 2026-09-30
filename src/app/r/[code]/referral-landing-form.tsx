"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { createReferralFromLink } from "@/app/actions/referrals";
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

/**
 * Public lead-capture form for a partner's referral link. Submits straight to the
 * `createReferralFromLink` server action (no auth / React Query) and swaps to a
 * confirmation once the lead is captured. `partnerName` is the referrer shown in
 * the intro copy.
 */
export function ReferralLandingForm({
  code,
  partnerName,
}: {
  code: string;
  partnerName: string;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const form = useForm<ReferContactFormData>({
    resolver: zodResolver(referContactSchema),
    defaultValues: DEFAULTS,
  });

  const onSubmit = async (values: ReferContactFormData) => {
    setPending(true);
    const res = await createReferralFromLink(code, values).catch(() => ({
      error: "Something went wrong. Please try again.",
    }));
    setPending(false);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <Card className="w-full">
        <CardHeader className="items-center text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="size-7" />
          </div>
          <CardTitle className="text-xl">Thanks — we&apos;ve got your details</CardTitle>
          <CardDescription className="mx-auto max-w-sm">
            A member of the Clara Central team will reach out soon. We appreciate {partnerName}{" "}
            connecting us.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Separator className="mb-4" />
          <div className="text-center">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              Learn more about Clara Central
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">You&apos;ve been referred to Clara Central</CardTitle>
        <CardDescription>
          {partnerName} recommended Clara Central for your bookkeeping. Share your details and our
          team will be in touch — no obligation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Jane Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
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
                  <FormLabel>Anything we should know?</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="What you're looking for, timing, current setup…"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Optional — a little context helps us prepare.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Submitting…" : "Submit"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Provide at least an email or phone number so we can reach you.
            </p>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
