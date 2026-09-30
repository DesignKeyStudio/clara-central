"use client";

import { useSyncExternalStore } from "react";

/** Never-changing store: the value is read once per render, nothing to subscribe to. */
const subscribeNever = () => () => {};

/**
 * Read a browser-only value (`window.*`, `document.*`) without a mount effect.
 *
 * The obvious version of this — `useState` plus `useEffect(() => setX(window…), [])`
 * — trips `react-hooks/set-state-in-effect`, because setting state synchronously in
 * an effect forces a second render pass on every mount. `useSyncExternalStore` gets
 * the same result as a first-class React primitive:
 *
 * - **Server render / hydration** → `serverValue`, so SSR and the hydration pass
 *   agree and React never warns about a mismatch.
 * - **After hydration** → `read()`, applied by React itself rather than by an effect.
 * - **Client-side navigation** (no server pass) → `read()` on the *first* render,
 *   which is strictly better than the effect version's one-frame flash of the
 *   fallback.
 *
 * `read` must return a stable primitive — it is called on every render, so a fresh
 * object or array each time would loop. For values that genuinely change over time
 * (viewport size, media queries), subscribe to the real event instead; see
 * `use-mobile.ts`.
 */
export function useClientValue<T extends string | number | boolean>(
  read: () => T,
  serverValue: T,
): T {
  return useSyncExternalStore(subscribeNever, read, () => serverValue);
}
