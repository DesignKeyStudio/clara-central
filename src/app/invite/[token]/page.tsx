import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getValidInviteByToken } from "@/lib/services/invite-service";
import { OnboardingForm } from "@/components/custom/onboarding-form";

export const metadata: Metadata = {
  title: "Complete your profile — Clara Central",
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await getValidInviteByToken(token);

  if (!invite) {
    return (
      <AuthShell>
        <Card className="w-full">
          <CardHeader className="space-y-1.5 text-center">
            <CardTitle className="text-xl">Invitation unavailable</CardTitle>
            <CardDescription>
              This invitation link is invalid or has expired. Ask your Clara Central contact to
              send you a new one.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              ← Back to Clara Central
            </Link>
          </CardContent>
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell className="max-w-2xl">
      <OnboardingForm mode="invite" token={token} prefill={invite} />
    </AuthShell>
  );
}
