import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/queries/server";
import { queryKeys } from "@/lib/queries/keys";
import { getReferralAction } from "@/app/actions/referrals";
import { ReferralDetailClient } from "./referral-detail-client";

export const metadata: Metadata = {
  title: "Referral · Clara Central",
};

export default async function ReferralDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.referral(id),
    queryFn: () => getReferralAction(id),
  });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ReferralDetailClient referralId={id} />
    </HydrationBoundary>
  );
}
