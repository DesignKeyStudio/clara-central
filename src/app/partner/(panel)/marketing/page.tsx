import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/queries/server";
import { queryKeys } from "@/lib/queries/keys";
import { getPartnerMarketingAction } from "@/app/actions/marketing";
import { PartnerMarketingClient } from "./partner-marketing-client";

export const metadata: Metadata = {
  title: "Marketing · Clara Central",
};

export default async function PartnerMarketingPage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.partnerMarketing,
    queryFn: () => getPartnerMarketingAction(),
  });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PartnerMarketingClient />
    </HydrationBoundary>
  );
}
