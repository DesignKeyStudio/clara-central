import { createAdminClient } from "@/lib/supabase/admin";
import { isPrototypeMode } from "@/lib/supabase/mock-client";
import { AVATAR_BUCKET } from "@/lib/supabase/buckets";

/**
 * Storage helpers for partner profile pictures. Sibling of `marketing-storage.ts`,
 * but the `avatars` bucket is PUBLIC — reads are stable, cacheable public URLs (no
 * signing), so the partner list can render many photos without per-row round-trips.
 * Writes still go through service-role single-use signed upload URLs (the browser
 * uploads the bytes directly, keeping blobs out of the Next server).
 *
 * Server-only — invoked from `src/app/actions/account.ts` (partner self-service)
 * and `src/app/actions/partners.ts` (admin edit/remove).
 */

/** The mock client (prototype mode) implements only `auth.*` — no `.storage`. */
function assertRealStorage(): void {
  if (isPrototypeMode()) {
    throw new Error("File storage is unavailable in prototype mode");
  }
}

/** Mint a single-use signed upload URL the browser uploads the avatar to directly. */
export async function createAvatarUploadUrl(
  path: string,
): Promise<{ path: string; token: string }> {
  assertRealStorage();
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) throw error ?? new Error("Could not create an upload URL");
  return { path: data.path, token: data.token };
}

/** Stable public URL for an object in the avatars bucket (no expiry, cacheable). */
export function avatarPublicUrl(path: string): string {
  assertRealStorage();
  const supabase = createAdminClient();
  return supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Prune a partner's avatar objects (best-effort). A partner keeps at most one
 * avatar, so on replace we remove every object under their `${partnerId}/` folder
 * except the freshly-uploaded `keepPath`; on removal we drop all of them.
 */
export async function pruneAvatarObjects(partnerId: string, keepPath?: string): Promise<void> {
  assertRealStorage();
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(AVATAR_BUCKET).list(partnerId);
  if (error || !data) return;
  const toRemove = data
    .map((obj) => `${partnerId}/${obj.name}`)
    .filter((p) => p !== keepPath);
  if (toRemove.length === 0) return;
  await supabase.storage.from(AVATAR_BUCKET).remove(toRemove);
}
