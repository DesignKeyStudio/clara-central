import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/queries/server";
import { queryKeys } from "@/lib/queries/keys";
import { getMyReferralAction } from "@/app/actions/partner-portal";
import { PartnerReferralDetailClient } from "./referral-detail-client";

export const metadata: Metadata = {
  title: "Referral · Clara Central",
};

export default async function PartnerReferralDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.myReferral(id),
    queryFn: () => getMyReferralAction(id),
  });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PartnerReferralDetailClient referralId={id} />
    </HydrationBoundary>
  );
}
