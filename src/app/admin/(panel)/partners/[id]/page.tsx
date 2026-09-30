import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/queries/server";
import { queryKeys } from "@/lib/queries/keys";
import { getPartnerAction } from "@/app/actions/partners";
import { PartnerDetailClient } from "./partner-detail-client";

export const metadata: Metadata = {
  title: "Partner · Clara Central",
};

export default async function PartnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.partner(id),
    queryFn: () => getPartnerAction(id),
  });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PartnerDetailClient partnerId={id} />
    </HydrationBoundary>
  );
}
