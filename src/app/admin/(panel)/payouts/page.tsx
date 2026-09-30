import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/queries/server";
import { queryKeys } from "@/lib/queries/keys";
import { getPayoutsAction, getPayoutsSummaryAction } from "@/app/actions/payouts";
import { PayoutsClient } from "./payouts-client";

export const metadata: Metadata = {
  title: "Payouts · Clara Central",
};

export default async function PayoutsPage() {
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.payouts,
      queryFn: () => getPayoutsAction(),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.payoutsSummary,
      queryFn: () => getPayoutsSummaryAction(),
    }),
  ]);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PayoutsClient />
    </HydrationBoundary>
  );
}
