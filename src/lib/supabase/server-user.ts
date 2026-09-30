import { createClient } from "@/lib/supabase/server";
import { getClaimsUser } from "@/lib/supabase/claims";
import { prisma } from "@/lib/prisma";
import type { PlatformServerUser } from "@/types";

/** Extract display name from Supabase user_metadata, preferring full_name over name. */
export function metadataDisplayName(meta: Record<string, unknown> | undefined): string | null {
  if (!meta) return null;
  for (const key of ["full_name", "name"] as const) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

/** Session user for the portal shell (header). Safe when env/client is missing. */
export async function getPlatformServerUser(): Promise<PlatformServerUser | null> {
  try {
    const supabase = await createClient();
    const claimsUser = await getClaimsUser(supabase);
    if (!claimsUser?.email) return null;

    // Prefer the DB display name — it's updated immediately when a user edits their
    // profile, whereas the JWT `user_metadata` copy only refreshes on token refresh.
    // Guarded separately so a DB hiccup falls back to metadata rather than blanking
    // the whole session (the layout redirects on a null user).
    let dbName: string | null = null;
    try {
      const profile = await prisma.userProfile.findUnique({
        where: { id: claimsUser.id },
        select: { fullName: true },
      });
      dbName = profile?.fullName?.trim() || null;
    } catch {
      dbName = null;
    }

    return {
      email: claimsUser.email,
      name: dbName ?? metadataDisplayName(claimsUser.userMetadata),
      role: claimsUser.role,
    };
  } catch {
    return null;
  }
}
