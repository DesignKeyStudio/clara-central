import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/queries/server";
import { queryKeys } from "@/lib/queries/keys";
import { getAppConfig } from "@/lib/services/app-config-service";
import { getSessionContext } from "@/lib/actions/auth-context";
import { getMyPayoutsAction } from "@/app/actions/partner-portal";
import { PartnerPayoutsClient } from "./payouts-client";

export const metadata: Metadata = {
  title: "Payouts · Clara Central",
};

export default async function PartnerPayoutsPage() {
  const queryClient = getQueryClient();
  const { organizationId } = await getSessionContext();
  // Cadence note is the partner's org config; read it server-side so the client
  // renders it only when set. Prefetch the partner's payouts alongside it.
  const [{ payoutCadenceNote }] = await Promise.all([
    getAppConfig(organizationId),
    queryClient.prefetchQuery({
      queryKey: queryKeys.myPayouts,
      queryFn: () => getMyPayoutsAction(),
    }),
  ]);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PartnerPayoutsClient cadenceNote={payoutCadenceNote} />
    </HydrationBoundary>
  );
}
