import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/queries/server";
import { queryKeys } from "@/lib/queries/keys";
import { getDashboardAction } from "@/app/actions/dashboard";
import { DashboardClient } from "./dashboard-client";

export const metadata: Metadata = {
  title: "Dashboard · Clara Central",
};

export default async function AdminDashboardPage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => getDashboardAction(),
  });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient />
    </HydrationBoundary>
  );
}
