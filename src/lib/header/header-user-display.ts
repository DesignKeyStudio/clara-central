import { emailLocalPart } from "@/lib/utils";
import type { PlatformServerUser } from "@/types";

/** Header label/email derived from the server (Supabase) session snapshot. */
export function resolveHeaderDisplay(
  serverUser: PlatformServerUser | null,
): { displayName: string; displayEmail: string } {
  const displayName =
    serverUser?.name ??
    (serverUser?.email ? emailLocalPart(serverUser.email) : null) ??
    "Account";
  const displayEmail = serverUser?.email ?? "";
  return { displayName, displayEmail };
}
