"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/layout/auth-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { resetPasswordSchema, type ResetPasswordFormData } from "@/lib/validations/auth";

export default function AdminResetPasswordPage() {
  const router = useRouter();
  const [success, setSuccess] = useState(false);
  // Gate the form on a valid recovery session — a direct visit (no reset link)
  // has no session and is bounced back to request a new link.
  const [checking, setChecking] = useState(true);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setChecking(false);
      } else {
        // No recovery session — the link is invalid/expired/used (or this was a
        // direct visit). Bounce to forgot-password with a flag so it explains why.
        router.replace("/admin/forgot-password?reset=expired");
      }
    });
  }, [router]);

  const onSubmit = async ({ password }: ResetPasswordFormData) => {
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      form.setError("root", { message: "This reset link has expired or is invalid" });
      return;
    }
    setSuccess(true);
    setTimeout(() => router.push("/admin/login"), 2000);
  };

  return (
    <AuthShell>
      <Card className="w-full">
        <CardHeader className="space-y-1.5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Admin access
          </p>
          <CardTitle className="text-xl">Set a new password</CardTitle>
          <CardDescription>Choose a password of at least 8 characters.</CardDescription>
        </CardHeader>

        <CardContent>
          {checking ? (
            <p className="text-sm text-muted-foreground">Verifying your reset link…</p>
          ) : success ? (
            <p className="text-sm text-muted-foreground">
              Password updated. Redirecting you to sign in…
            </p>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New password</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm password</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.formState.errors.root && (
                  <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
                )}
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Updating…" : "Update password"}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </AuthShell>
  );
}
