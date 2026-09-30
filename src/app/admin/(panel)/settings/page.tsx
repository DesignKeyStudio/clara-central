import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/queries/server";
import { queryKeys } from "@/lib/queries/keys";
import { getAppConfigAction } from "@/app/actions/app-config";
import { SettingsClient } from "./settings-client";

export const metadata: Metadata = {
  title: "Settings · Clara Central",
};

export default async function SettingsPage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.appConfig,
    queryFn: () => getAppConfigAction(),
  });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SettingsClient />
    </HydrationBoundary>
  );
}
