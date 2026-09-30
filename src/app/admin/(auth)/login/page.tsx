"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { adminSignIn } from "@/app/actions/auth";
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
import { loginSchema, type LoginFormData } from "@/lib/validations/auth";

export default function AdminLoginPage() {
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginFormData) => {
    // On success the server action redirects; only failures return here.
    const result = await adminSignIn(values);
    if (result?.error) {
      form.setError("root", { message: result.error });
    }
  };

  return (
    <AuthSplitShell>
      <div className="w-full max-w-sm">
          <div className="space-y-2 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary/70">
              Admin access
            </p>
            <h1 className="font-display text-4xl font-bold text-[#00342E]">Sign in</h1>
            <p className="text-sm text-muted-foreground">
              Manage partners, referrals &amp; payouts. Internal team only.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-6">
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

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <Link
                        href="/admin/forgot-password"
                        className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                      >
                        Forgot?
                      </Link>
                    </div>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.formState.errors.root && (
                <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
              )}

              <Button
                type="submit"
                className="h-12 w-full rounded-lg text-base"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Signing In…" : "Sign In"}
              </Button>
            </form>
          </Form>

          <p className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              ← Back to home
            </Link>
          </p>
        </div>
    </AuthSplitShell>
  );
}
