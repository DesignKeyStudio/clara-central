"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { requestPartnerOtp, verifyPartnerOtp } from "@/app/actions/auth";
import { AuthSplitShell } from "@/components/layout/auth-split-shell";
import { useResendCountdown } from "@/hooks/use-resend-countdown";
import { REGEXP_ONLY_DIGITS } from "input-otp";
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { partnerEmailSchema, type PartnerEmailFormData } from "@/lib/validations/auth";

// Cooldown before a new code can be requested. Aligns with Supabase's own resend
// cooldown (`max_frequency`, default 60s) and OTP freshness — resending sooner
// just bounces off Supabase's rate limit.
const RESEND_SECONDS = 60;

export default function PartnerLoginPage() {
  const [stage, setStage] = useState<"email" | "code">("email");
  // The confirmed email (set once step 1 succeeds); step 2 + resend read from it.
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const { secondsLeft, start: startCountdown } = useResendCountdown();

  const form = useForm<PartnerEmailFormData>({
    resolver: zodResolver(partnerEmailSchema),
    defaultValues: { email: "" },
  });

  const sendCode = async ({ email: nextEmail }: PartnerEmailFormData) => {
    setError("");
    setNotice("");
    setLoading(true);
    const result = await requestPartnerOtp({ email: nextEmail });
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setEmail(nextEmail);
    setCode("");
    setStage("code");
    startCountdown(RESEND_SECONDS);
  };

  const resendCode = async () => {
    if (secondsLeft > 0 || resending || loading) return;
    setError("");
    setNotice("");
    setResending(true);
    const result = await requestPartnerOtp({ email });
    setResending(false);
    if ("error" in result) {
      setError(result.error);
      // Rate-limited: keep the entered code, show no confirmation, and keep the
      // resend control disabled for the server-provided retry window.
      if (result.retryAfterMs) startCountdown(result.retryAfterMs / 1000);
      return;
    }
    setCode("");
    startCountdown(RESEND_SECONDS);
    setNotice("A new code has been sent.");
  };

  const submitCode = async (value: string) => {
    if (loading || value.length !== 6) return;
    setError("");
    setNotice("");
    setLoading(true);
    // On success the server action redirects; only failures return here.
    const result = await verifyPartnerOtp({ email, code: value });
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  const verify = (e: React.FormEvent) => {
    e.preventDefault();
    void submitCode(code);
  };

  return (
    <AuthSplitShell>
      <div className="w-full max-w-sm">
          {stage === "email" ? (
            <>
              <div className="space-y-2 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-primary/70">
                  Partner portal
                </p>
                <h1 className="font-display text-4xl font-bold text-[#00342E]">Sign in</h1>
                <p className="text-sm text-muted-foreground">
                  Enter your email and we&apos;ll send you a one-time code.
                </p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(sendCode)} className="mt-8 space-y-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="you@company.com"
                            autoComplete="email"
                            disabled={loading}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="h-12 w-full rounded-lg text-base" disabled={loading}>
                    {loading ? "Sending…" : "Send Code"}
                  </Button>
                </form>
              </Form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                New partner?{" "}
                <Link
                  href="/apply"
                  className="font-medium text-foreground underline-offset-2 hover:underline"
                >
                  Apply to join the program
                </Link>
              </p>
            </>
          ) : (
            <>
              <div className="space-y-3 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary text-foreground">
                  <Mail className="size-6" />
                </div>
                <div className="space-y-1.5">
                  <h1 className="font-display text-3xl font-bold text-[#00342E]">Enter your code</h1>
                  <p className="text-sm text-muted-foreground">
                    We sent a 6-digit code to{" "}
                    <span className="font-medium text-foreground">{email}</span>.
                  </p>
                </div>
              </div>

              <form onSubmit={verify} className="mt-8 space-y-4">
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={code}
                    onChange={setCode}
                    onComplete={(value) => void submitCode(value)}
                    pattern={REGEXP_ONLY_DIGITS}
                    autoFocus
                    disabled={loading}
                    aria-label="6-digit verification code"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="size-12 text-lg" />
                      <InputOTPSlot index={1} className="size-12 text-lg" />
                      <InputOTPSlot index={2} className="size-12 text-lg" />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} className="size-12 text-lg" />
                      <InputOTPSlot index={4} className="size-12 text-lg" />
                      <InputOTPSlot index={5} className="size-12 text-lg" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {error && (
                  <p role="alert" className="text-center text-sm text-destructive">
                    {error}
                  </p>
                )}
                {notice && (
                  <p role="status" aria-live="polite" className="text-center text-sm text-primary">
                    {notice}
                  </p>
                )}
                <Button
                  type="submit"
                  className="h-12 w-full rounded-lg text-base"
                  disabled={loading || code.length !== 6}
                >
                  {loading ? "Verifying…" : "Verify & sign in"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  {process.env.NEXT_PUBLIC_PARTNER_OTP_EMAIL === "true"
                    ? "Didn't get it? Check your spam folder, or "
                    : "Email delivery isn't set up yet — enter any 6 digits to continue. "}
                  <button
                    type="button"
                    onClick={() => void resendCode()}
                    disabled={secondsLeft > 0 || resending || loading}
                    className="font-medium text-foreground underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:font-normal disabled:text-muted-foreground disabled:no-underline"
                  >
                    {resending
                      ? "Sending…"
                      : secondsLeft > 0
                        ? `Resend code in ${secondsLeft}s`
                        : "Resend code"}
                  </button>
                </p>
                <p className="text-center text-xs text-muted-foreground">
                  <button
                    type="button"
                    className="underline-offset-2 hover:text-foreground hover:underline"
                    onClick={() => {
                      setStage("email");
                      setCode("");
                      setError("");
                      setNotice("");
                    }}
                  >
                    Use a different email
                  </button>
                </p>
              </form>
            </>
          )}

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
