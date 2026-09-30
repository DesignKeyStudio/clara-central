"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { AuthSplitShell } from "@/components/layout/auth-split-shell";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClientValue } from "@/hooks/use-client-value";
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/lib/validations/auth";

export default function AdminForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  // The trimmed email we sent to — shown in the confirmation copy.
  const [sentEmail, setSentEmail] = useState("");
  // True when we arrived here from an invalid/expired reset link (?reset=expired),
  // so we can explain why instead of the page silently appearing. Read on the client
  // only — this page is prerendered, so the query string isn't known at build time.
  const linkExpired = useClientValue(
    () => new URLSearchParams(window.location.search).get("reset") === "expired",
    false,
  );

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async ({ email }: ForgotPasswordFormData) => {
    try {
      const supabase = createClient();
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/admin/reset-password`,
      });
    } catch {
      // Always show the same confirmation — no email enumeration.
    }
    setSentEmail(email);
    setSent(true);
  };

  return (
    <AuthSplitShell>
      <div className="w-full max-w-sm">
        <div className="space-y-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary/70">
            Admin access
          </p>
          <h1 className="font-display text-4xl font-bold text-[#00342E]">Reset password</h1>
          <p className="text-sm text-muted-foreground">
            {sent ? "Check your email for a reset link." : "We'll email you a reset link."}
          </p>
        </div>

        {sent ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            If an account exists for{" "}
            <span className="font-medium text-foreground">{sentEmail}</span>, a reset link is on its
            way.
          </p>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-6">
              {linkExpired && (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  This password reset link is invalid or has expired. Request a new one below.
                </p>
              )}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="h-12 w-full rounded-lg text-base"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Sending…" : "Send Reset Link"}
              </Button>
            </form>
          </Form>
        )}

        <p className="mt-6 text-center">
          <Link
            href="/admin/login"
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            ← Back to sign in
          </Link>
        </p>
      </div>
    </AuthSplitShell>
  );
}
