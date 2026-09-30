"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { OnboardingForm } from "@/components/custom/onboarding-form";
import { StatusBadge } from "@/components/custom/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

/**
 * Public self-registration flow: the onboarding form (apply mode), swapped for an
 * "Application received" confirmation once submitted. The applicant is `pending`
 * until an admin approves — at which point they can sign in via OTP.
 */
export function ApplyFlow() {
  const [applied, setApplied] = useState(false);

  if (!applied) {
    return <OnboardingForm mode="apply" onApplied={() => setApplied(true)} />;
  }

  return (
    <Card className="w-full">
      <CardHeader className="items-center text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-500">
          <Clock className="size-7" />
        </div>
        <CardTitle className="text-xl">Application received</CardTitle>
        <CardDescription className="mx-auto max-w-sm">
          Thanks for applying! A Clara Central admin will review your application. You&apos;ll get an
          email when you&apos;re approved — then you can sign in.
        </CardDescription>
        <StatusBadge label="Pending approval" tone="warning" />
      </CardHeader>
      <CardContent>
        <Separator className="mb-4" />
        <div className="text-center">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            ← Back to home
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
