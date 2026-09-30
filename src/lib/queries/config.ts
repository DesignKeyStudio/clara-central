import type { QueryClientConfig } from "@tanstack/react-query";

/**
 * Shared QueryClient defaults used by BOTH the browser client
 * (`ReactQueryProvider`) and the per-request server client (`getQueryClient`),
 * so RSC-prefetched data hydrates with matching freshness semantics.
 *
 * `staleTime: 5m` is what lets a server-prefetched query hydrate on the client
 * without an immediate refetch on mount — the navigation feels instant.
 */
export const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
};
