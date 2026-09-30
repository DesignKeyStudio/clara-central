"use server";

import { getSessionContext } from "@/lib/actions/auth-context";
import { diffChanges, logActivity } from "@/lib/services/activity-service";
import { sanitizeDescription } from "@/lib/sanitize";
import {
  badgeFromFile,
  canPreviewInline,
  createLinkItemSchema,
  createSectionSchema,
  fileExtension,
  finalizeFileItemSchema,
  isCoverImage,
  isInlineImage,
  prepareCoverUploadSchema,
  prepareUploadSchema,
  renameSectionSchema,
  reorderItemsSchema,
  reorderSectionsSchema,
  replaceFileItemSchema,
  setItemCoverSchema,
  updateItemSchema,
  validateCoverImage,
  validateFile,
} from "@/lib/validations/marketing";
import {
  createFileItem,
  createLinkItem,
  createSection,
  deleteItem,
  deleteSection,
  getItem,
  listMarketing,
  renameSection,
  reorderItems,
  reorderSections,
  replaceItemFile,
  updateItem,
  updateItemCover,
  type MarketingItemView,
  type MarketingSectionView,
} from "@/lib/services/marketing-service";
import {
  createMarketingDownloadUrl,
  createMarketingPreviewUrl,
  createMarketingPreviewUrls,
  createMarketingUploadUrl,
  removeMarketingObjects,
} from "@/lib/supabase/marketing-storage";

export type SectionResult = { section: MarketingSectionView } | { error: string };
export type ItemResult = { item: MarketingItemView } | { error: string };
export type OkResult = { ok: true } | { error: string };
export type DownloadUrlResult = { url: string } | { error: string };
export type PrepareUploadResult = { path: string; token: string } | { error: string };

/** Item enriched with thumbnail + previewability — shared by the admin authoring page and the partner library. */
export type EnrichedMarketingItem = MarketingItemView & {
  /** Inline signed URL for raster-image thumbnails; null for everything else. */
  thumbnailUrl: string | null;
  /** Inline signed URL for the admin-set cover image; null when none. Wins over `thumbnailUrl` in the card. */
  coverImageUrl: string | null;
  /** Can this open an in-app preview (image `<img>` / PDF `<iframe>`)? */
  previewable: boolean;
};

export type EnrichedMarketingSection = Omit<MarketingSectionView, "items"> & {
  items: EnrichedMarketingItem[];
};

/** Admin gate, mirroring `partners.ts`. Returns the context for activity logging. */
async function requireAdmin() {
  const ctx = await getSessionContext();
  if (ctx.role !== "admin") throw new Error("Forbidden");
  return ctx;
}

/**
 * Enrich pure-Prisma sections with batch-minted inline thumbnail URLs for
 * raster-image items (ONE Storage round-trip) and a `previewable` flag. Storage
 * stays in the action layer — the service never carries signed URLs. Best-effort:
 * a Storage failure (or prototype mode) degrades to no thumbnails, never breaks
 * the page — the UI falls back to the gradient file-type box.
 */
async function enrichMarketingSections(
  sections: MarketingSectionView[],
): Promise<EnrichedMarketingSection[]> {
  const allItems = sections.flatMap((s) => s.items);
  // A hidden cover suppresses the file's own auto thumbnail (card falls to the placeholder).
  const imagePaths = allItems
    .filter(
      (i) => i.kind === "file" && i.storagePath && !i.coverHidden && isInlineImage(i.fileName ?? ""),
    )
    .map((i) => i.storagePath as string);
  const coverPaths = allItems
    .filter((i) => i.coverImagePath && isCoverImage(i.coverImagePath))
    .map((i) => i.coverImagePath as string);

  // One Storage round-trip covers both the raster-image thumbnails and the cover art.
  let urls = new Map<string, string>();
  try {
    urls = await createMarketingPreviewUrls([...imagePaths, ...coverPaths]);
  } catch {
    urls = new Map();
  }

  return sections.map((s) => ({
    ...s,
    items: s.items.map((i) => ({
      ...i,
      thumbnailUrl:
        i.kind === "file" && i.storagePath && !i.coverHidden
          ? (urls.get(i.storagePath) ?? null)
          : null,
      coverImageUrl: i.coverImagePath ? (urls.get(i.coverImagePath) ?? null) : null,
      previewable: i.kind === "file" ? canPreviewInline(i.fileName ?? "") : false,
    })),
  }));
}

// ── Read ──

/**
 * Admin-only: all sections + items for the Marketing page, enriched with inline
 * thumbnail URLs + a `previewable` flag (same shape as the partner library) so
 * the authoring rows show each file at a glance.
 */
export async function getMarketingAction(): Promise<EnrichedMarketingSection[]> {
  const ctx = await requireAdmin();
  return enrichMarketingSections(await listMarketing(ctx.organizationId));
}

/**
 * Mint a signed download URL for a file item. Available to ANY logged-in user
 * (admin OR approved partner — `getSessionContext` enforces both), since the
 * partner portal will reuse this action later.
 */
export async function getMarketingDownloadUrlAction(itemId: string): Promise<DownloadUrlResult> {
  const ctx = await getSessionContext();
  const item = await getItem(ctx.organizationId, itemId);
  if (!item) return { error: "Item not found" };
  if (item.kind !== "file" || !item.storagePath) {
    return { error: "This item has no downloadable file" };
  }
  try {
    const url = await createMarketingDownloadUrl(item.storagePath, item.fileName ?? "download");
    return { url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not create a download link" };
  }
}

/**
 * Read-only marketing library for the partner page. Available to any logged-in
 * user (admin or approved partner — mirrors `getMarketingDownloadUrlAction`),
 * since marketing is org-wide and this lets admins QA the partner view. Same
 * enriched shape as `getMarketingAction`.
 */
export async function getPartnerMarketingAction(): Promise<EnrichedMarketingSection[]> {
  const ctx = await getSessionContext();
  return enrichMarketingSections(await listMarketing(ctx.organizationId));
}

/**
 * Mint a short-lived INLINE signed URL for previewing a file in-app (image
 * `<img>` / PDF `<iframe>`). Available to any logged-in user. Refuses items that
 * aren't on the inline allowlist (SVG/Office/ZIP) — those are download-only.
 */
export async function getMarketingPreviewUrlAction(itemId: string): Promise<DownloadUrlResult> {
  const ctx = await getSessionContext();
  const item = await getItem(ctx.organizationId, itemId);
  if (!item) return { error: "Item not found" };
  if (item.kind !== "file" || !item.storagePath) {
    return { error: "This item has no previewable file" };
  }
  if (!canPreviewInline(item.fileName ?? "")) {
    return { error: "This file type can't be previewed" };
  }
  try {
    const url = await createMarketingPreviewUrl(item.storagePath);
    return { url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not create a preview link" };
  }
}

// ── Sections ──

export async function createSectionAction(input: unknown): Promise<SectionResult> {
  const ctx = await requireAdmin();
  const parsed = createSectionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid section" };

  const section = await createSection(ctx.organizationId, parsed.data.title);
  await logActivity({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "created",
    entityType: "marketing_section",
    entityId: section.id,
    entityName: section.title,
    changes: { title: section.title },
  }).catch(() => {});
  return { section };
}

export async function renameSectionAction(id: string, input: unknown): Promise<SectionResult> {
  const ctx = await requireAdmin();
  const parsed = renameSectionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid section" };

  const result = await renameSection(ctx.organizationId, id, parsed.data.title);
  if (!result) return { error: "Section not found" };
  await logActivity({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "updated",
    entityType: "marketing_section",
    entityId: id,
    entityName: result.section.title,
    changes: { title: { from: result.previousTitle, to: result.section.title } },
  }).catch(() => {});
  return { section: result.section };
}

export async function deleteSectionAction(id: string): Promise<OkResult> {
  const ctx = await requireAdmin();
  try {
    const { storagePaths, title } = await deleteSection(ctx.organizationId, id);
    // Best-effort blob cleanup — never block the delete on Storage.
    await removeMarketingObjects(storagePaths).catch(() => {});
    await logActivity({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "deleted",
      entityType: "marketing_section",
      entityId: id,
      entityName: title,
      changes: title ? { deletedRecord: { title } } : null,
    }).catch(() => {});
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not delete the section" };
  }
}

export async function reorderSectionsAction(input: unknown): Promise<OkResult> {
  const ctx = await requireAdmin();
  const parsed = reorderSectionsSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid order" };
  await reorderSections(ctx.organizationId, parsed.data.orderedIds);
  return { ok: true };
}

// ── Items: links + edit + reorder + delete ──

/**
 * Validate a client-supplied cover path: it must live under the item's section
 * covers folder and be a raster image. Returns the path, or an error string.
 */
function validateCoverPath(
  sectionId: string,
  coverPath: string,
): { ok: true } | { ok: false; error: string } {
  if (!coverPath.startsWith(`${sectionId}/covers/`)) {
    return { ok: false, error: "Invalid cover image path" };
  }
  if (!isCoverImage(coverPath)) {
    return { ok: false, error: "Cover image must be a PNG or JPG" };
  }
  return { ok: true };
}

export async function createLinkItemAction(input: unknown): Promise<ItemResult> {
  const ctx = await requireAdmin();
  const parsed = createLinkItemSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid link" };
  const d = parsed.data;

  if (d.coverPath) {
    const check = validateCoverPath(d.sectionId, d.coverPath);
    if (!check.ok) return { error: check.error };
  }

  const item = await createLinkItem(ctx.organizationId, {
    sectionId: d.sectionId,
    name: d.name,
    url: d.url,
    description: sanitizeDescription(d.description),
    coverImagePath: d.coverPath ?? null,
    coverHidden: !d.coverPath && !!d.coverHidden,
  });
  await logActivity({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "created",
    entityType: "marketing_item",
    entityId: item.id,
    entityName: item.name,
    changes: { name: item.name, kind: "link", type: item.type, url: item.url },
  }).catch(() => {});
  return { item };
}

export async function updateItemAction(id: string, input: unknown): Promise<ItemResult> {
  const ctx = await requireAdmin();
  const parsed = updateItemSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid item" };
  const d = parsed.data;

  const before = await getItem(ctx.organizationId, id);
  const item = await updateItem(ctx.organizationId, id, {
    name: d.name,
    description: sanitizeDescription(d.description),
    url: d.url ?? null,
  });
  if (!item) return { error: "Item not found" };
  await logActivity({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "updated",
    entityType: "marketing_item",
    entityId: id,
    entityName: item.name,
    changes: before
      ? diffChanges(
          { name: before.name, description: before.description, url: before.url },
          { name: item.name, description: item.description, url: item.url },
        )
      : null,
  }).catch(() => {});
  return { item };
}

export async function deleteItemAction(id: string): Promise<OkResult> {
  const ctx = await requireAdmin();
  try {
    const { storagePath, coverImagePath, deleted } = await deleteItem(ctx.organizationId, id);
    const blobs = [storagePath, coverImagePath].filter((p): p is string => !!p);
    if (blobs.length) await removeMarketingObjects(blobs).catch(() => {});
    await logActivity({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "deleted",
      entityType: "marketing_item",
      entityId: id,
      entityName: deleted?.name,
      changes: deleted ? { deletedRecord: deleted } : null,
    }).catch(() => {});
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not delete the item" };
  }
}

export async function reorderItemsAction(input: unknown): Promise<OkResult> {
  const ctx = await requireAdmin();
  const parsed = reorderItemsSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid order" };
  await reorderItems(ctx.organizationId, parsed.data.sectionId, parsed.data.orderedIds);
  return { ok: true };
}

// ── Items: file upload (signed-upload, 2 actions bracketing a direct browser upload) ──

/**
 * Step 1: validate the intended file and mint a single-use signed upload URL.
 * The path is derived server-side as `${sectionId}/${uuid}.${ext}` so the client
 * can never inject an arbitrary storage key.
 */
export async function prepareFileUploadAction(input: unknown): Promise<PrepareUploadResult> {
  await requireAdmin();
  const parsed = prepareUploadSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid upload request" };
  const { sectionId, fileName, size } = parsed.data;

  const check = validateFile({ name: fileName, size });
  if (!check.ok) return { error: check.error };

  const path = `${sectionId}/${crypto.randomUUID()}.${fileExtension(fileName)}`;
  try {
    const { path: storedPath, token } = await createMarketingUploadUrl(path);
    return { path: storedPath, token };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not start the upload" };
  }
}

/**
 * Step 3: persist the MarketingItem row after the browser uploaded the bytes.
 * Trust-sensitive fields (path prefix, badge `type`) are re-derived/validated
 * server-side — never trusted from the client.
 */
export async function finalizeFileItemAction(input: unknown): Promise<ItemResult> {
  const ctx = await requireAdmin();
  const parsed = finalizeFileItemSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid file details" };
  const d = parsed.data;

  if (!d.path.startsWith(`${d.sectionId}/`)) return { error: "Invalid file path" };
  const type = badgeFromFile(d.fileName);
  if (!type) return { error: "Unsupported file type" };

  if (d.coverPath) {
    const check = validateCoverPath(d.sectionId, d.coverPath);
    if (!check.ok) return { error: check.error };
  }

  const item = await createFileItem(ctx.organizationId, {
    sectionId: d.sectionId,
    name: d.name,
    type,
    storagePath: d.path,
    fileName: d.fileName,
    coverImagePath: d.coverPath ?? null,
    coverHidden: !d.coverPath && !!d.coverHidden,
    description: sanitizeDescription(d.description),
  });
  await logActivity({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "created",
    entityType: "marketing_item",
    entityId: item.id,
    entityName: item.name,
    changes: { name: item.name, kind: "file", type: item.type, fileName: item.fileName },
  }).catch(() => {});
  return { item };
}

/**
 * Replace the file on an existing file item (MKT-3). Same trust model as
 * `finalizeFileItemAction`: the path prefix is validated against the item's real
 * section (never trusted from the client) and the badge `type` is re-derived. The
 * previous storage object is purged best-effort after the row is repointed.
 */
export async function replaceFileItemAction(itemId: string, input: unknown): Promise<ItemResult> {
  const ctx = await requireAdmin();
  const parsed = replaceFileItemSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid file details" };
  const d = parsed.data;

  const current = await getItem(ctx.organizationId, itemId);
  if (!current) return { error: "Item not found" };
  if (current.kind !== "file") return { error: "Only file items can have their file replaced" };
  if (d.sectionId !== current.sectionId || !d.path.startsWith(`${current.sectionId}/`)) {
    return { error: "Invalid file path" };
  }
  const type = badgeFromFile(d.fileName);
  if (!type) return { error: "Unsupported file type" };

  const res = await replaceItemFile(ctx.organizationId, itemId, {
    storagePath: d.path,
    fileName: d.fileName,
    type,
  });
  if (!res) return { error: "Item not found" };

  // Purge the old blob (best-effort) once the row points at the new object.
  if (res.oldStoragePath && res.oldStoragePath !== d.path) {
    await removeMarketingObjects([res.oldStoragePath]).catch(() => {});
  }

  await logActivity({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "updated",
    entityType: "marketing_item",
    entityId: itemId,
    entityName: res.item.name,
    changes: { fileName: { from: current.fileName, to: res.item.fileName } },
  }).catch(() => {});
  return { item: res.item };
}

// ── Items: cover image (optional card art on any item) ──

/**
 * Mint a signed upload URL for a cover image. Image-only + smaller cap than files;
 * the path is derived server-side under `${sectionId}/covers/` so the client can
 * never inject an arbitrary storage key.
 */
export async function prepareCoverUploadAction(input: unknown): Promise<PrepareUploadResult> {
  await requireAdmin();
  const parsed = prepareCoverUploadSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid upload request" };
  const { sectionId, fileName, size } = parsed.data;

  const check = validateCoverImage({ name: fileName, size });
  if (!check.ok) return { error: check.error };

  const path = `${sectionId}/covers/${crypto.randomUUID()}.${fileExtension(fileName)}`;
  try {
    const { path: storedPath, token } = await createMarketingUploadUrl(path);
    return { path: storedPath, token };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not start the upload" };
  }
}

/**
 * Set (a freshly-uploaded path) or clear (null) an item's cover image. The path is
 * validated against the item's real section, and the previous cover blob is purged
 * best-effort once the row is repointed.
 */
export async function setItemCoverAction(itemId: string, input: unknown): Promise<ItemResult> {
  const ctx = await requireAdmin();
  const parsed = setItemCoverSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid cover image" };
  const { coverPath } = parsed.data;

  const current = await getItem(ctx.organizationId, itemId);
  if (!current) return { error: "Item not found" };
  if (coverPath) {
    const check = validateCoverPath(current.sectionId, coverPath);
    if (!check.ok) return { error: check.error };
  }

  // Removing a cover (null path) forces the placeholder even for image files.
  const res = await updateItemCover(ctx.organizationId, itemId, coverPath, !coverPath);
  if (!res) return { error: "Item not found" };

  // Purge the old cover (best-effort) once the row points at the new one (or none).
  if (res.oldCoverPath && res.oldCoverPath !== coverPath) {
    await removeMarketingObjects([res.oldCoverPath]).catch(() => {});
  }

  await logActivity({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "updated",
    entityType: "marketing_item",
    entityId: itemId,
    entityName: res.item.name,
    changes: { coverImage: coverPath ? "set" : "removed" },
  }).catch(() => {});
  return { item: res.item };
}
