import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/queries/server";
import { queryKeys } from "@/lib/queries/keys";
import { getMyProfileAction } from "@/app/actions/account";
import { AdminProfileClient } from "./profile-client";

export const metadata: Metadata = {
  title: "Profile · Clara Central",
};

export default async function AdminProfilePage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.myProfile,
    queryFn: () => getMyProfileAction(),
  });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AdminProfileClient />
    </HydrationBoundary>
  );
}
