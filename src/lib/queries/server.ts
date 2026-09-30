import { QueryClient } from "@tanstack/react-query";
import { cache } from "react";
import { queryClientConfig } from "./config";

/**
 * Per-request QueryClient for React Server Components. (Server-only: relies on
 * React `cache()`, which is a no-op outside a request render.)
 *
 * Wrapped in `cache()` so every call within a single request render returns the
 * same client (a layout + page can share one), while each request gets a fresh
 * client — no cross-request cache leakage.
 *
 * Usage in a server-component `page.tsx`:
 *   const qc = getQueryClient();
 *   await qc.prefetchQuery({ queryKey, queryFn: () => someReadAction() });
 *   return <HydrationBoundary state={dehydrate(qc)}><Client /></HydrationBoundary>;
 *
 * Prefetching a read action here is a direct server-side function call (NOT a
 * POST round-trip), so it reuses the action's exact auth gate and return shape.
 */
export const getQueryClient = cache(() => new QueryClient(queryClientConfig));
