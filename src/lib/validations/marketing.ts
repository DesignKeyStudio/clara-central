import { z } from "zod";
import { optionalUrlSchema, urlSchema } from "./url";

/**
 * Zod schemas + file constraints for the admin Marketing feature. Mirrors the
 * shape of `partner.ts`: trimmed strings, friendly messages, `z.infer` exports.
 *
 * `description` is rich-text HTML (authored in the Tiptap editor). It is NOT
 * trimmed/escaped here — the server action runs it through `sanitizeDescription`
 * (`src/lib/sanitize.ts`) before persisting.
 */

// ── Sections ──

export const createSectionSchema = z.object({
  title: z.string().trim().min(1, "Section title is required").max(120, "Keep the title under 120 characters"),
});
export type CreateSectionFormData = z.infer<typeof createSectionSchema>;

export const renameSectionSchema = createSectionSchema;

// ── Items: links ──

export const linkItemSchema = z.object({
  name: z.string().trim().min(1, "Link title is required").max(200),
  url: urlSchema,
  description: z.string().optional(),
});
export type LinkItemFormData = z.infer<typeof linkItemSchema>;

export const createLinkItemSchema = linkItemSchema.extend({
  sectionId: z.string().min(1),
  /** Optional admin-set cover image already uploaded to `${sectionId}/covers/…`. */
  coverPath: z.string().optional(),
  /** Force the type placeholder on the card (used when the admin removes an auto cover). */
  coverHidden: z.boolean().optional(),
});

// ── Items: files ──

/** Metadata fields for the file create/edit form (the File is handled separately). */
export const fileItemMetaSchema = z.object({
  name: z.string().trim().min(1, "Display name is required").max(200),
  description: z.string().optional(),
});
export type FileItemFormData = z.infer<typeof fileItemMetaSchema>;

/** Step 1 of the signed-upload flow — request an upload URL for an intended file. */
export const prepareUploadSchema = z.object({
  sectionId: z.string().min(1),
  fileName: z.string().min(1),
  size: z.number().int().nonnegative(),
});

/** Same shape as `prepareUploadSchema`, used by the cover-image upload flow. */
export const prepareCoverUploadSchema = prepareUploadSchema;

/** Step 3 — persist the MarketingItem row after the browser uploaded the bytes. */
export const finalizeFileItemSchema = fileItemMetaSchema.extend({
  sectionId: z.string().min(1),
  fileName: z.string().min(1),
  path: z.string().min(1),
  /** Optional admin-set cover image already uploaded to `${sectionId}/covers/…`. */
  coverPath: z.string().optional(),
  /** Force the type placeholder on the card even when the file itself is an image. */
  coverHidden: z.boolean().optional(),
});

/** Set or clear an item's cover image (null clears it). */
export const setItemCoverSchema = z.object({
  coverPath: z.string().min(1).nullable(),
});

/** Replace the file on an existing file item (MKT-3) — same upload flow, no metadata change. */
export const replaceFileItemSchema = z.object({
  sectionId: z.string().min(1),
  fileName: z.string().min(1),
  path: z.string().min(1),
});

// ── Items: shared edit + reorder ──

/** Edit metadata. `url` is only meaningful for link items (required by the link edit form). */
export const updateItemSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().optional(),
  url: optionalUrlSchema,
});

export const reorderItemsSchema = z.object({
  sectionId: z.string().min(1),
  orderedIds: z.array(z.string().min(1)).min(1),
});

export const reorderSectionsSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});

// ── File constraints (shared by the upload action and the dialog's <input accept>) ──

export const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * Accepted upload extensions → badge label. Kept in lockstep with the bucket's
 * `allowed_mime_types` (docs / slides / images / archives). The extension is the
 * authoritative gate — browser MIME is unreliable (ZIP arrives as
 * `application/zip`, `application/x-zip-compressed`, or `application/octet-stream`).
 */
export const EXT_BADGE = {
  pdf: "PDF",
  pptx: "PPTX",
  ppt: "PPT",
  docx: "DOCX",
  xlsx: "XLSX",
  png: "IMAGE",
  jpg: "IMAGE",
  jpeg: "IMAGE",
  svg: "IMAGE",
  zip: "ZIP",
} as const;

/** Value for an `<input type="file" accept>` attribute, e.g. ".pdf,.pptx,…". */
export const ACCEPT_ATTR = Object.keys(EXT_BADGE)
  .map((ext) => `.${ext}`)
  .join(",");

/** Lowercased extension after the final dot, or "" if none. */
export function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();
}

/** Badge label for a file by extension, or null if the type isn't accepted. */
export function badgeFromFile(fileName: string): string | null {
  const ext = fileExtension(fileName) as keyof typeof EXT_BADGE;
  return EXT_BADGE[ext] ?? null;
}

/** Validate an intended upload by name + size. Returns the derived badge on success. */
export function validateFile(
  file: { name: string; size: number },
): { ok: true; type: string } | { ok: false; error: string } {
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: "File is larger than the 50 MB limit" };
  }
  const type = badgeFromFile(file.name);
  if (!type) {
    return { ok: false, error: "Unsupported file type" };
  }
  return { ok: true, type };
}

// ── Cover images (optional per-item card art) ──

/**
 * Covers are decorative card art an admin can attach to ANY item (link or file),
 * shown in place of the auto thumbnail / file-type placeholder. Restricted to
 * raster images so they can be served with inline disposition (see
 * `INLINE_IMAGE_EXTS` / `marketing-storage.ts`) — never SVG.
 */
export const MAX_COVER_BYTES = 5 * 1024 * 1024; // 5 MB

/** Extensions accepted for a cover image (raster only — inline-safe). */
export const COVER_EXTS = new Set(["png", "jpg", "jpeg"]);

/** Value for the cover-image `<input type="file" accept>` attribute. */
export const ACCEPT_COVER_ATTR = ".png,.jpg,.jpeg";

/** True if a storage path / filename is an accepted cover image. */
export function isCoverImage(fileName: string): boolean {
  return COVER_EXTS.has(fileExtension(fileName));
}

/** Validate an intended cover image by name + size. */
export function validateCoverImage(
  file: { name: string; size: number },
): { ok: true } | { ok: false; error: string } {
  if (!isCoverImage(file.name)) {
    return { ok: false, error: "Cover image must be a PNG or JPG" };
  }
  if (file.size > MAX_COVER_BYTES) {
    return { ok: false, error: "Cover image must be under 5 MB" };
  }
  return { ok: true };
}

// ── Inline-preview policy ──

/**
 * Extensions safe to serve with INLINE disposition for in-app preview / thumbnails.
 * Deliberately narrow: downloads are forced to attachment to neutralize the
 * inline-SVG-script XSS angle (see `marketing-storage.ts`), and inline preview
 * reopens it — so only raster images (`<img>`) and PDFs (`<iframe>`) qualify.
 *
 * NOTE: `svg` carries the `IMAGE` badge via `EXT_BADGE`, so the preview decision
 * MUST branch on the file extension here, never on the `type` badge. SVG (and
 * everything else: pptx/docx/xlsx/zip…) stays attachment-download-only.
 */
export const INLINE_PREVIEW_EXTS = new Set(["png", "jpg", "jpeg", "pdf"]);

/** Raster images that render as an `<img>` thumbnail/preview (excludes PDF). */
export const INLINE_IMAGE_EXTS = new Set(["png", "jpg", "jpeg"]);

/** True if the file may be previewed inline (image `<img>` or PDF `<iframe>`). */
export function canPreviewInline(fileName: string): boolean {
  return INLINE_PREVIEW_EXTS.has(fileExtension(fileName));
}

/** True if the file renders as an inline `<img>` (raster image, not PDF/SVG). */
export function isInlineImage(fileName: string): boolean {
  return INLINE_IMAGE_EXTS.has(fileExtension(fileName));
}
