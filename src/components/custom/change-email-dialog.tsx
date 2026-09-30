"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import {
  requestEmailChangeAction,
  verifyEmailChangeAction,
} from "@/app/actions/account";
import {
  requestEmailChangeSchema,
  type RequestEmailChangeFormData,
} from "@/lib/validations/account";
import { useResendCountdown } from "@/hooks/use-resend-countdown";
import { queryKeys } from "@/lib/queries/keys";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";

// NEXT_PUBLIC_* vars are inlined at build time, so this mirrors the login page's
// copy: when real email delivery isn't configured, any 6 digits confirm the change.
const EMAIL_DELIVERY_ON = process.env.NEXT_PUBLIC_PARTNER_OTP_EMAIL === "true";

// Cooldown before a new code can be requested — mirrors the login OTP screen and
// Supabase's own resend cooldown (`max_frequency`, default 60s).
const RESEND_SECONDS = 60;

/**
 * Two-step "change my email" flow, mirroring the login OTP screen: enter a new
 * email → confirm with a 6-digit code. Works for both admins and partners (the
 * backing actions are role-aware). The code is mocked (any 6 digits) until email
 * delivery is enabled — see the change-email actions in src/app/actions/account.ts.
 *
 * `disabled` renders an inert trigger — used in demo orgs, where the actions refuse
 * the change anyway (`MyProfile.isDemo`). The caller explains why.
 */
export function ChangeEmailDialog({
  currentEmail,
  disabled = false,
}: {
  currentEmail: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const { secondsLeft, start: startCountdown } = useResendCountdown();

  const form = useForm<RequestEmailChangeFormData>({
    resolver: zodResolver(requestEmailChangeSchema),
    defaultValues: { email: "" },
  });

  const reset = () => {
    setStage("email");
    setEmail("");
    setCode("");
    setError("");
    setNotice("");
    setLoading(false);
    setResending(false);
    startCountdown(0);
    form.reset({ email: "" });
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  const sendCode = async ({ email: nextEmail }: RequestEmailChangeFormData) => {
    setError("");
    setNotice("");
    setLoading(true);
    const result = await requestEmailChangeAction({ email: nextEmail });
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
    const result = await requestEmailChangeAction({ email });
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
    const result = await verifyEmailChangeAction({ email, code: value });
    if ("error" in result) {
      setError(result.error);
      setLoading(false);
      return;
    }
    toast.success("Email updated");
    await queryClient.invalidateQueries({ queryKey: queryKeys.myProfile });
    router.refresh();
    handleOpenChange(false);
  };

  const verify = (e: React.FormEvent) => {
    e.preventDefault();
    void submitCode(code);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled}>
          Change email
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {stage === "email" ? (
          <>
            <DialogHeader>
              <DialogTitle>Change your email</DialogTitle>
              <DialogDescription>
                Enter your new email address. We&apos;ll send a 6-digit code to confirm it&apos;s
                yours.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(sendCode)} className="space-y-6 pt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-email">Current email</Label>
                    <Input id="current-email" type="email" value={currentEmail} readOnly disabled />
                  </div>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New email *</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="you@company.com"
                            autoComplete="email"
                            disabled={loading}
                            autoFocus
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleOpenChange(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Sending…" : "Send code"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        ) : (
          <>
            <DialogHeader className="items-center pl-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-foreground">
                <Mail className="size-6" />
              </div>
              <DialogTitle>Enter your code</DialogTitle>
              <DialogDescription>
                We sent a 6-digit code to{" "}
                <span className="break-all font-medium text-foreground">{email}</span>.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={verify} className="space-y-5 pt-4 pb-6">
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
              <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
                {loading ? "Confirming…" : "Confirm new email"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                {EMAIL_DELIVERY_ON
                  ? "Didn't get it? Check your spam folder, or "
                  : "Email delivery isn't set up yet — enter any 6 digits to confirm. "}
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
      </DialogContent>
    </Dialog>
  );
}
