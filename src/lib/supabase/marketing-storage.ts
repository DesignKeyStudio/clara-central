import { createAdminClient } from "@/lib/supabase/admin";
import { isPrototypeMode } from "@/lib/supabase/mock-client";
import { MARKETING_BUCKET } from "@/lib/supabase/buckets";
import { canPreviewInline } from "@/lib/validations/marketing";

/**
 * The ONLY Supabase-Storage caller in the app. Keeps Storage out of the pure
 * services (per CODEMAP) and centralizes the bucket name + signed-URL TTL.
 * Server-only — invoked exclusively from `src/app/actions/marketing.ts`.
 *
 * All access is via the service-role client (bypasses RLS); partner/admin
 * downloads are delivered as short-lived signed URLs forced to download as
 * attachments (neutralizes the SVG-inline-script XSS angle).
 *
 * The ONE exception is inline-preview URLs (`createMarketingPreviewUrl[s]`),
 * which omit the `download` flag so images/PDFs render in-page. To keep the
 * XSS guard intact, those helpers refuse any path whose extension is not in the
 * inline allowlist (`canPreviewInline`) — so SVG/Office/ZIP can NEVER be minted
 * with inline disposition, regardless of caller bugs.
 */
export const DOWNLOAD_TTL = 60 * 5; // 5 minutes

/**
 * Preview/thumbnail URLs live longer than the React Query `staleTime` (5 min) so
 * cached thumbnail URLs can't expire (and 403) before the list would refetch.
 */
export const PREVIEW_TTL = 60 * 60; // 1 hour

/** The mock client (prototype mode) implements only `auth.*` — no `.storage`. */
function assertRealStorage(): void {
  if (isPrototypeMode()) {
    throw new Error("File storage is unavailable in prototype mode");
  }
}

/** Hard gate: inline disposition is only ever minted for allowlisted extensions. */
function assertInlineSafe(path: string): void {
  if (!canPreviewInline(path)) {
    throw new Error("This file type cannot be previewed inline");
  }
}

/** Mint a single-use signed upload URL the browser uploads to directly. */
export async function createMarketingUploadUrl(
  path: string,
): Promise<{ path: string; token: string }> {
  assertRealStorage();
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(MARKETING_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) throw error ?? new Error("Could not create an upload URL");
  return { path: data.path, token: data.token };
}

/** Short-lived signed download URL, forced to download as `fileName` (attachment). */
export async function createMarketingDownloadUrl(
  path: string,
  fileName: string,
): Promise<string> {
  assertRealStorage();
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(MARKETING_BUCKET)
    .createSignedUrl(path, DOWNLOAD_TTL, { download: fileName });
  if (error || !data) throw error ?? new Error("Could not create a download URL");
  return data.signedUrl;
}

/**
 * Long-lived signed URL with INLINE disposition (no `download` flag) for a single
 * file, used for on-demand image/PDF preview. Throws for non-inline extensions.
 */
export async function createMarketingPreviewUrl(path: string): Promise<string> {
  assertRealStorage();
  assertInlineSafe(path);
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(MARKETING_BUCKET)
    .createSignedUrl(path, PREVIEW_TTL);
  if (error || !data) throw error ?? new Error("Could not create a preview URL");
  return data.signedUrl;
}

/**
 * Batch inline preview URLs (one Storage round-trip) for card thumbnails. Silently
 * drops any non-inline path (defense-in-depth — callers should pre-filter to
 * raster images). Returns a `path → signedUrl` map; paths that failed are absent.
 */
export async function createMarketingPreviewUrls(
  paths: string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const safe = paths.filter((p) => canPreviewInline(p));
  if (safe.length === 0) return result;
  assertRealStorage();

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(MARKETING_BUCKET)
    .createSignedUrls(safe, PREVIEW_TTL);
  if (error || !data) throw error ?? new Error("Could not create preview URLs");

  for (const entry of data) {
    if (entry.signedUrl && entry.path) result.set(entry.path, entry.signedUrl);
  }
  return result;
}

/** Remove storage objects (no-op on an empty list). */
export async function removeMarketingObjects(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  assertRealStorage();
  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(MARKETING_BUCKET).remove(paths);
  if (error) throw error;
}
