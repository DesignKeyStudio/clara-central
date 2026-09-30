import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/queries/server";
import { queryKeys } from "@/lib/queries/keys";
import { getReferralsAction } from "@/app/actions/referrals";
import { ReferralsClient } from "./referrals-client";

export const metadata: Metadata = {
  title: "Referrals · Clara Central",
};

export default async function ReferralsPage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.referrals,
    queryFn: () => getReferralsAction(),
  });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ReferralsClient />
    </HydrationBoundary>
  );
}
