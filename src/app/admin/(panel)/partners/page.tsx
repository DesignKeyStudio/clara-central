import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/queries/server";
import { queryKeys } from "@/lib/queries/keys";
import { getInvitesAction, getPartnersAction } from "@/app/actions/partners";
import { PartnersClient } from "./partners-client";

export const metadata: Metadata = {
  title: "Partners · Clara Central",
};

export default async function PartnersPage() {
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.partners,
      queryFn: () => getPartnersAction(),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.invites,
      queryFn: () => getInvitesAction(),
    }),
  ]);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PartnersClient />
    </HydrationBoundary>
  );
}
