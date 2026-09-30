import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/queries/server";
import { queryKeys } from "@/lib/queries/keys";
import { getMarketingAction } from "@/app/actions/marketing";
import { MarketingClient } from "./marketing-client";

export const metadata: Metadata = {
  title: "Marketing · Clara Central",
};

export default async function MarketingPage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.marketing,
    queryFn: () => getMarketingAction(),
  });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MarketingClient />
    </HydrationBoundary>
  );
}
