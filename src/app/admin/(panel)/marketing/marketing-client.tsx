"use client";

import { type FocusEvent, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Copy,
  Download,
  ExternalLink,
  Eye,
  File,
  FileArchive,
  FileSpreadsheet,
  FileText,
  GripVertical,
  ImageIcon,
  Link2,
  Pencil,
  Plus,
  Presentation,
  Trash2,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ClampedDescription } from "@/components/custom/clamped-description";
import { FileTypeThumb } from "@/components/custom/file-type-thumb";
import { MarketingPreviewDialog } from "@/components/custom/marketing-preview-dialog";
import { PageHeader } from "@/components/custom/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchMarketingDownloadUrl,
  useMarketing,
  useRenameSection,
  useReorderItems,
  useReorderSections,
} from "@/lib/queries/hooks";
import type { EnrichedMarketingItem, EnrichedMarketingSection } from "@/app/actions/marketing";
import { cn } from "@/lib/utils";
import { CreateItemDialog } from "./create-item-dialog";
import { CreateSectionDialog } from "./create-section-dialog";
import { DeleteItemDialog } from "./delete-item-dialog";
import { DeleteSectionDialog } from "./delete-section-dialog";
import { EditItemDialog } from "./edit-item-dialog";

/** Lucide icon per file type — shown in the footer type chip. */
const TYPE_ICON: Record<string, LucideIcon> = {
  PDF: FileText,
  DOC: FileText,
  DOCX: FileText,
  PPT: Presentation,
  PPTX: Presentation,
  XLSX: FileSpreadsheet,
  ZIP: FileArchive,
  IMAGE: ImageIcon,
  LINK: Link2,
};

/**
 * Full-bleed card thumbnail for a material — the uploaded image itself when we have
 * a thumbnail URL, otherwise a gradient type box (PDF / ZIP / PPTX / LINK …). Lets
 * an admin see what's uploaded at a glance, mirroring the partner cards.
 */
function MaterialThumb({ item }: { item: EnrichedMarketingItem }) {
  // An admin-set cover wins; otherwise a raster image shows itself; otherwise the box.
  const displayUrl = item.coverImageUrl ?? item.thumbnailUrl;
  if (displayUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={displayUrl}
        alt=""
        className="h-full w-full rounded-none object-cover"
        loading="lazy"
      />
    );
  }
  return <FileTypeThumb type={item.type} className="h-full w-full rounded-none" />;
}

/** Shared drag-and-drop sensors: pointer (with a small activation threshold) + keyboard. */
function useReorderSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

type HandleProps = { attributes: DraggableAttributes; listeners: DraggableSyntheticListeners };

/** A grab handle button; spreads dnd-kit listeners/attributes. */
function DragHandle({
  label,
  attributes,
  listeners,
  className,
}: {
  label: string;
  className?: string;
} & HandleProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex size-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring active:cursor-grabbing",
        className,
      )}
      aria-label={label}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-4" />
    </button>
  );
}

function MaterialItem({ item }: { item: EnrichedMarketingItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const isLink = item.kind === "link";
  const canDownload = item.kind === "file" && !!item.storagePath;
  const canPreview = item.previewable && canDownload;
  const TypeIcon = TYPE_ICON[item.type] ?? File;

  const copyLink = async () => {
    if (!item.url) return;
    try {
      await navigator.clipboard.writeText(item.url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  const openLink = () => {
    if (item.url) window.open(item.url, "_blank", "noopener,noreferrer");
  };

  const download = async () => {
    setDownloading(true);
    try {
      const url = await fetchMarketingDownloadUrl(item.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't get the file");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group flex flex-col gap-3 rounded-xl bg-card p-3 shadow-[0_4px_24px_-6px_rgba(168,163,148,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-8px_rgba(168,163,148,0.5)]",
        isDragging && "z-10 opacity-70 shadow-lg",
      )}
    >
      {/* Framed thumbnail with a gentle hover zoom + drag handle overlay */}
      <div className="relative">
        {canPreview ? (
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="relative aspect-[16/10] w-full cursor-zoom-in overflow-hidden rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            title="Click to preview"
            aria-label={`Preview ${item.name}`}
          >
            <div className="size-full transition-transform duration-300 ease-out group-hover:scale-[1.05]">
              <MaterialThumb item={item} />
            </div>
          </button>
        ) : (
          <div className="aspect-[16/10] w-full overflow-hidden rounded-xl">
            <div className="size-full transition-transform duration-300 ease-out group-hover:scale-[1.05]">
              <MaterialThumb item={item} />
            </div>
          </div>
        )}
        <DragHandle
          label={`Reorder ${item.name}`}
          attributes={attributes}
          listeners={listeners}
          className="absolute left-2 top-2 z-10 size-7 rounded-md bg-background/80 text-muted-foreground shadow-sm backdrop-blur-sm hover:bg-background hover:text-foreground"
        />
      </div>

      {/* Title + meta */}
      <div className="px-1">
        {canPreview ? (
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="block max-w-full truncate rounded text-left text-lg font-semibold tracking-tight text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            title="Click to preview"
          >
            {item.name}
          </button>
        ) : (
          <p className="truncate text-lg font-semibold tracking-tight text-foreground">
            {item.name}
          </p>
        )}
        {item.description ? <ClampedDescription html={item.description} /> : null}
      </div>

      {/* Footer: type chip + actions */}
      <div className="mt-auto flex items-center justify-between gap-2 px-1 pt-1">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <TypeIcon className="size-[18px]" aria-hidden />
        </span>

        <div className="flex items-center gap-1.5">
          {isLink ? (
            <>
              <Button
                size="icon"
                variant="outline"
                className="size-9 rounded-lg"
                onClick={openLink}
                disabled={!item.url}
                aria-label={`Open ${item.name}`}
                title="Open"
              >
                <ExternalLink className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="size-9 rounded-lg"
                onClick={copyLink}
                aria-label="Copy link"
                title="Copy link"
              >
                <Copy className="size-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                size="icon"
                variant="outline"
                className="size-9 rounded-lg"
                onClick={download}
                disabled={!canDownload || downloading}
                title={canDownload ? "Download" : "No file uploaded yet"}
                aria-label={`Download ${item.name}`}
              >
                <Download className="size-4" />
              </Button>
              {canPreview ? (
                <Button
                  size="icon"
                  variant="outline"
                  className="size-9 rounded-lg"
                  onClick={() => setPreviewOpen(true)}
                  aria-label={`Preview ${item.name}`}
                  title="Preview"
                >
                  <Eye className="size-4" />
                </Button>
              ) : null}
            </>
          )}
          <Button
            size="icon"
            variant="outline"
            className="size-9 rounded-lg"
            onClick={() => setEditOpen(true)}
            aria-label={`Edit ${item.name}`}
            title="Edit"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="size-9 rounded-lg border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
            aria-label={`Delete ${item.name}`}
            title="Delete"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {canPreview ? (
        <MarketingPreviewDialog item={previewOpen ? item : null} onOpenChange={setPreviewOpen} />
      ) : null}
      <EditItemDialog item={item} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteItemDialog
        itemId={item.id}
        itemName={item.name}
        isFile={item.kind === "file"}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}

/** A section's items list with drag-and-drop reordering (MKT-2). */
function SectionItems({ section }: { section: EnrichedMarketingSection }) {
  const reorder = useReorderItems();
  const sensors = useReorderSensors();

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = section.items.map((i) => i.id);
    const orderedIds = arrayMove(
      ids,
      ids.indexOf(active.id as string),
      ids.indexOf(over.id as string),
    );
    reorder.mutate({ sectionId: section.id, orderedIds });
  };

  if (section.items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No items yet — upload a file or add a link.</p>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={section.items.map((i) => i.id)} strategy={rectSortingStrategy}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {section.items.map((item) => (
            <MaterialItem key={item.id} item={item} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SectionCard({
  section,
  handleProps,
}: {
  section: EnrichedMarketingSection;
  handleProps: HandleProps;
}) {
  const [createKind, setCreateKind] = useState<"file" | "link" | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const rename = useRenameSection();

  const onRename = (e: FocusEvent<HTMLInputElement>) => {
    const title = e.target.value.trim();
    if (!title || title === section.title) {
      e.target.value = section.title;
      return;
    }
    rename.mutate({ id: section.id, title }, { onError: (err) => toast.error(err.message) });
  };

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 space-y-0">
        <DragHandle
          label={`Reorder ${section.title} section`}
          attributes={handleProps.attributes}
          listeners={handleProps.listeners}
        />
        <Input
          key={section.title}
          defaultValue={section.title}
          onBlur={onRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          aria-label="Section title"
          className="h-8 max-w-xs border-transparent bg-transparent px-1 text-xl font-semibold shadow-none hover:border-input focus-visible:border-input md:text-xl"
        />
        <CardAction className="ml-auto flex items-center gap-2 self-center">
          <Button variant="outline" size="sm" onClick={() => setCreateKind("file")}>
            <Upload className="size-4" />
            Upload File
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCreateKind("link")}>
            <Link2 className="size-4" />
            Add Link
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
            aria-label={`Delete ${section.title} section`}
          >
            <Trash2 className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <SectionItems section={section} />
      </CardContent>

      <CreateItemDialog
        sectionId={section.id}
        kind={createKind ?? "file"}
        open={createKind !== null}
        onOpenChange={(open) => {
          if (!open) setCreateKind(null);
        }}
      />
      <DeleteSectionDialog
        sectionId={section.id}
        sectionTitle={section.title}
        itemCount={section.items.length}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </Card>
  );
}

/** A draggable section card (MKT-1) — wraps SectionCard with sortable wiring. */
function SortableSection({ section }: { section: EnrichedMarketingSection }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "z-10 opacity-70")}
    >
      <SectionCard section={section} handleProps={{ attributes, listeners }} />
    </div>
  );
}

export function MarketingClient() {
  const { data: sections = [], isLoading } = useMarketing();
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const reorderSections = useReorderSections();
  const sensors = useReorderSensors();

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = sections.map((s) => s.id);
    const orderedIds = arrayMove(
      ids,
      ids.indexOf(active.id as string),
      ids.indexOf(over.id as string),
    );
    reorderSections.mutate(orderedIds);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketing Materials"
        subtitle="What partners see — with edit controls. Drag to reorder sections and items."
        actions={
          <Button onClick={() => setAddSectionOpen(true)}>
            <Plus className="size-4" />
            Add Section
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      ) : sections.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No sections yet — add one to start organizing marketing materials.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-6">
              {sections.map((section) => (
                <SortableSection key={section.id} section={section} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <CreateSectionDialog open={addSectionOpen} onOpenChange={setAddSectionOpen} />
    </div>
  );
}
