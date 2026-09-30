import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/queries/server";
import { queryKeys } from "@/lib/queries/keys";
import { getActivityLogAction } from "@/app/actions/audit-log";
import { AuditLogClient } from "./audit-log-client";

export const metadata: Metadata = {
  title: "Activity log · Clara Central",
};

export default async function AuditLogPage() {
  const queryClient = getQueryClient();
  // Unfiltered default — the client filters the result set in-memory, so this is
  // the single query it issues (key `["audit-log", {}]`).
  await queryClient.prefetchQuery({
    queryKey: queryKeys.auditLog(),
    queryFn: () => getActivityLogAction(),
  });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AuditLogClient />
    </HydrationBoundary>
  );
}
