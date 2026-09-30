import { Prisma, type MarketingItem } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toISOString } from "@/lib/actions/mappers";

// ── View-models ──
// Pure-Prisma source of truth for the admin Marketing feature. NO Supabase here
// (Storage lives in the action layer / `marketing-storage.ts`). The view-model
// reconciles the legacy mock shape with the real schema: it exposes `name`/`type`/
// `kind`/`storagePath` and never carries a signed download URL (those are minted
// on demand so they don't leak into cached query data or go stale).

export type MarketingItemKind = "file" | "link";

export type MarketingItemView = {
  id: string;
  sectionId: string;
  name: string;
  kind: MarketingItemKind;
  /** Badge label: PDF / PPTX / ZIP / IMAGE / LINK … */
  type: string;
  /** External URL for link items; null for files. */
  url: string | null;
  /** Storage object path for file items; null for links (and seed metadata). */
  storagePath: string | null;
  fileName: string | null;
  /** Optional admin-set cover image path (any item kind); null when none. */
  coverImagePath: string | null;
  /** When true, the card shows the type placeholder even if the file is an image. */
  coverHidden: boolean;
  /** Sanitized HTML. */
  description: string | null;
  sortOrder: number;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type MarketingSectionView = {
  id: string;
  title: string;
  sortOrder: number;
  items: MarketingItemView[];
};

// ── Helpers ──

function toItemView(i: MarketingItem): MarketingItemView {
  return {
    id: i.id,
    sectionId: i.sectionId,
    name: i.name,
    kind: i.kind,
    type: i.type,
    url: i.url,
    storagePath: i.storagePath,
    fileName: i.fileName,
    coverImagePath: i.coverImagePath,
    coverHidden: i.coverHidden,
    description: i.description,
    sortOrder: i.sortOrder,
    createdAt: toISOString(i.createdAt),
    updatedAt: toISOString(i.updatedAt),
  };
}

function isNotFound(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025";
}

async function nextSectionSortOrder(organizationId: string): Promise<number> {
  const agg = await prisma.marketingSection.aggregate({
    where: { organizationId },
    _max: { sortOrder: true },
  });
  return (agg._max.sortOrder ?? -1) + 1;
}

async function nextItemSortOrder(organizationId: string, sectionId: string): Promise<number> {
  const agg = await prisma.marketingItem.aggregate({
    where: { organizationId, sectionId },
    _max: { sortOrder: true },
  });
  return (agg._max.sortOrder ?? -1) + 1;
}

// ── Queries ──

/** All sections (asc) with their items (asc), in one nested query. */
export async function listMarketing(organizationId: string): Promise<MarketingSectionView[]> {
  const sections = await prisma.marketingSection.findMany({
    where: { organizationId },
    orderBy: { sortOrder: "asc" },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  return sections.map((s) => ({
    id: s.id,
    title: s.title,
    sortOrder: s.sortOrder,
    items: s.items.map(toItemView),
  }));
}

/** A single item (for the download-URL action). */
export async function getItem(
  organizationId: string,
  id: string,
): Promise<MarketingItemView | null> {
  const i = await prisma.marketingItem.findFirst({ where: { id, organizationId } });
  return i ? toItemView(i) : null;
}

// ── Section mutations ──

export async function createSection(
  organizationId: string,
  title: string,
): Promise<MarketingSectionView> {
  const sortOrder = await nextSectionSortOrder(organizationId);
  const s = await prisma.marketingSection.create({ data: { organizationId, title, sortOrder } });
  return { id: s.id, title: s.title, sortOrder: s.sortOrder, items: [] };
}

/** Rename a section; returns the refreshed view + the prior title (for audit diffs), or null. */
export async function renameSection(
  organizationId: string,
  id: string,
  title: string,
): Promise<{ section: MarketingSectionView; previousTitle: string } | null> {
  const existing = await prisma.marketingSection.findFirst({
    where: { id, organizationId },
    select: { title: true },
  });
  if (!existing) return null;
  try {
    const s = await prisma.marketingSection.update({
      where: { id },
      data: { title },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    return {
      section: { id: s.id, title: s.title, sortOrder: s.sortOrder, items: s.items.map(toItemView) },
      previousTitle: existing.title,
    };
  } catch (e) {
    if (isNotFound(e)) return null;
    throw e;
  }
}

/**
 * Delete a section (DB cascade removes its item rows) and RETURN the storage
 * paths of its file items so the action layer can purge Storage, plus the section
 * title for the audit trail. Idempotent (returns nulls when already gone).
 */
export async function deleteSection(
  organizationId: string,
  id: string,
): Promise<{ storagePaths: string[]; title: string | null }> {
  const section = await prisma.marketingSection.findFirst({
    where: { id, organizationId },
    select: {
      title: true,
      items: { select: { storagePath: true, coverImagePath: true, kind: true } },
    },
  });
  if (!section) return { storagePaths: [], title: null };
  // Every removable blob: file bytes (file items) + cover art (any kind).
  const storagePaths = [
    ...section.items
      .filter((i) => i.kind === "file" && i.storagePath)
      .map((i) => i.storagePath as string),
    ...section.items.filter((i) => i.coverImagePath).map((i) => i.coverImagePath as string),
  ];
  try {
    await prisma.marketingSection.delete({ where: { id } });
  } catch (e) {
    if (isNotFound(e)) return { storagePaths: [], title: section.title };
    throw e;
  }
  return { storagePaths, title: section.title };
}

export async function reorderSections(
  organizationId: string,
  orderedIds: string[],
): Promise<void> {
  await prisma.$transaction(
    orderedIds.map((id, i) =>
      // Scope by organizationId so an id from another org can't be reordered in.
      prisma.marketingSection.updateMany({ where: { id, organizationId }, data: { sortOrder: i } }),
    ),
  );
}

// ── Item mutations ──

export type CreateLinkItemInput = {
  sectionId: string;
  name: string;
  url: string;
  description: string | null;
  coverImagePath?: string | null;
  coverHidden?: boolean;
};

export async function createLinkItem(
  organizationId: string,
  input: CreateLinkItemInput,
): Promise<MarketingItemView> {
  const sortOrder = await nextItemSortOrder(organizationId, input.sectionId);
  const i = await prisma.marketingItem.create({
    data: {
      organizationId,
      sectionId: input.sectionId,
      name: input.name,
      kind: "link",
      type: "LINK",
      url: input.url,
      description: input.description,
      coverImagePath: input.coverImagePath ?? null,
      coverHidden: input.coverHidden ?? false,
      sortOrder,
    },
  });
  return toItemView(i);
}

export type CreateFileItemInput = {
  sectionId: string;
  name: string;
  type: string; // badge derived from the filename
  storagePath: string;
  fileName: string;
  description: string | null;
  coverImagePath?: string | null;
  coverHidden?: boolean;
};

export async function createFileItem(
  organizationId: string,
  input: CreateFileItemInput,
): Promise<MarketingItemView> {
  const sortOrder = await nextItemSortOrder(organizationId, input.sectionId);
  const i = await prisma.marketingItem.create({
    data: {
      organizationId,
      sectionId: input.sectionId,
      name: input.name,
      kind: "file",
      type: input.type,
      storagePath: input.storagePath,
      fileName: input.fileName,
      coverImagePath: input.coverImagePath ?? null,
      coverHidden: input.coverHidden ?? false,
      description: input.description,
      sortOrder,
    },
  });
  return toItemView(i);
}

/**
 * Set or clear an item's cover image (any kind). `coverHidden` forces the type
 * placeholder even for image files (set when the admin removes an auto cover).
 * Returns the refreshed view + the OLD cover path so the caller can purge the
 * stale blob. Null when the item's gone.
 */
export async function updateItemCover(
  organizationId: string,
  id: string,
  coverImagePath: string | null,
  coverHidden: boolean,
): Promise<{ item: MarketingItemView; oldCoverPath: string | null } | null> {
  const existing = await prisma.marketingItem.findFirst({
    where: { id, organizationId },
    select: { coverImagePath: true },
  });
  if (!existing) return null;
  try {
    const i = await prisma.marketingItem.update({
      where: { id },
      data: { coverImagePath, coverHidden },
    });
    return { item: toItemView(i), oldCoverPath: existing.coverImagePath };
  } catch (e) {
    if (isNotFound(e)) return null;
    throw e;
  }
}

export type UpdateItemInput = { name: string; description: string | null; url?: string | null };

/** Edit metadata only (name/description always; url for links). File bytes are immutable here. */
export async function updateItem(
  organizationId: string,
  id: string,
  input: UpdateItemInput,
): Promise<MarketingItemView | null> {
  const existing = await prisma.marketingItem.findFirst({
    where: { id, organizationId },
    select: { kind: true },
  });
  if (!existing) return null;

  const data: Prisma.MarketingItemUpdateInput = {
    name: input.name,
    description: input.description,
  };
  if (existing.kind === "link" && input.url != null) {
    data.url = input.url;
  }

  const i = await prisma.marketingItem.update({ where: { id }, data });
  return toItemView(i);
}

export type ReplaceItemFileInput = { storagePath: string; fileName: string; type: string };

/**
 * Swap the underlying file on a file item (MKT-3): point it at a freshly-uploaded
 * object and refresh the badge `type`. Returns the new view + the OLD storage path so
 * the caller can purge the stale blob. Null when the item is missing or isn't a file.
 */
export async function replaceItemFile(
  organizationId: string,
  id: string,
  input: ReplaceItemFileInput,
): Promise<{ item: MarketingItemView; oldStoragePath: string | null } | null> {
  const existing = await prisma.marketingItem.findFirst({
    where: { id, organizationId },
    select: { kind: true, storagePath: true },
  });
  if (!existing || existing.kind !== "file") return null;
  const i = await prisma.marketingItem.update({
    where: { id },
    data: { storagePath: input.storagePath, fileName: input.fileName, type: input.type },
  });
  return { item: toItemView(i), oldStoragePath: existing.storagePath };
}

/** A deleted item's identifying fields, snapshotted for the audit trail. */
export type DeletedItemSnapshot = {
  name: string;
  kind: MarketingItemKind;
  type: string;
  url: string | null;
  fileName: string | null;
};

/**
 * Delete an item and RETURN its storage path (null for links) for Storage cleanup,
 * plus a snapshot of the deleted row for the audit trail. Idempotent.
 */
export async function deleteItem(
  organizationId: string,
  id: string,
): Promise<{
  storagePath: string | null;
  coverImagePath: string | null;
  deleted: DeletedItemSnapshot | null;
}> {
  const owned = await prisma.marketingItem.findFirst({
    where: { id, organizationId },
    select: { id: true },
  });
  if (!owned) return { storagePath: null, coverImagePath: null, deleted: null };
  try {
    const i = await prisma.marketingItem.delete({
      where: { id },
      select: {
        storagePath: true,
        coverImagePath: true,
        kind: true,
        name: true,
        type: true,
        url: true,
        fileName: true,
      },
    });
    return {
      storagePath: i.kind === "file" ? i.storagePath : null,
      coverImagePath: i.coverImagePath,
      deleted: { name: i.name, kind: i.kind, type: i.type, url: i.url, fileName: i.fileName },
    };
  } catch (e) {
    if (isNotFound(e)) return { storagePath: null, coverImagePath: null, deleted: null };
    throw e;
  }
}

export async function reorderItems(
  organizationId: string,
  sectionId: string,
  orderedIds: string[],
): Promise<void> {
  await prisma.$transaction(
    orderedIds.map((id, i) =>
      // Scope by organizationId + sectionId so an id from another org/section can't be reordered in.
      prisma.marketingItem.updateMany({
        where: { id, organizationId, sectionId },
        data: { sortOrder: i },
      }),
    ),
  );
}
