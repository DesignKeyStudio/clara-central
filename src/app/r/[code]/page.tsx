import type { Metadata } from "next";
import Link from "next/link";
import { LinkIcon } from "lucide-react";
import { AuthShell } from "@/components/layout/auth-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getPartnerByReferralCode } from "@/lib/services/partner-service";
import { ReferralLandingForm } from "./referral-landing-form";

export const metadata: Metadata = {
  title: "Refer a business — Clara Central",
  // Per-partner links are shared privately; keep them out of search indexes.
  robots: { index: false, follow: false },
};

/**
 * Public per-partner referral landing (`/r/[code]`). Resolves the partner behind
 * the code; an approved partner's link renders the lead-capture form (leads are
 * auto-attributed to them), while a missing/pending/rejected code shows a neutral
 * "unavailable" card that never reveals whether the code exists.
 */
export default async function ReferralLandingPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const partner = await getPartnerByReferralCode(code);
  const isValid = partner?.status === "approved";

  return (
    <AuthShell className="max-w-xl">
      {isValid ? (
        <ReferralLandingForm
          code={code}
          partnerName={partner.companyName?.trim() || partner.fullName}
        />
      ) : (
        <Card className="w-full">
          <CardHeader className="items-center text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <LinkIcon className="size-7" />
            </div>
            <CardTitle className="text-xl">This referral link is unavailable</CardTitle>
            <CardDescription className="mx-auto max-w-sm">
              The link you followed is inactive or no longer valid. Please double-check it, or ask
              whoever shared it with you for an updated link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Separator className="mb-4" />
            <div className="text-center">
              <Link
                href="/"
                className="text-sm text-muted-foreground hover:text-foreground hover:underline"
              >
                Go to Clara Central
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </AuthShell>
  );
}
