import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/queries/server";
import { queryKeys } from "@/lib/queries/keys";
import {
  getMyPartnerSummaryAction,
  getMyReferralsAction,
} from "@/app/actions/partner-portal";
import { MyReferralsClient } from "./my-referrals-client";

export const metadata: Metadata = {
  title: "My Referrals · Clara Central",
};

export default async function PartnerReferralsPage() {
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.myReferrals,
      queryFn: () => getMyReferralsAction(),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.myPartnerSummary,
      queryFn: () => getMyPartnerSummaryAction(),
    }),
  ]);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MyReferralsClient />
    </HydrationBoundary>
  );
}
