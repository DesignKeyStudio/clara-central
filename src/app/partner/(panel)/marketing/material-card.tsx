"use client";

import { useState } from "react";
import {
  Copy,
  Download,
  Eye,
  ExternalLink,
  File,
  FileArchive,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  Link2,
  Presentation,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ClampedDescription } from "@/components/custom/clamped-description";
import { fetchMarketingDownloadUrl } from "@/lib/queries/hooks";
import { FileTypeThumb } from "@/components/custom/file-type-thumb";
import type { EnrichedMarketingItem } from "@/app/actions/marketing";

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

/** One marketing material in the partner grid: framed thumbnail, title, meta, actions. */
export function MaterialCard({
  item,
  onPreview,
}: {
  item: EnrichedMarketingItem;
  onPreview: (item: EnrichedMarketingItem) => void;
}) {
  const [downloading, setDownloading] = useState(false);

  const isLink = item.kind === "link";
  const canDownload = item.kind === "file" && !!item.storagePath;
  const TypeIcon = TYPE_ICON[item.type] ?? File;

  // An admin-set cover wins; otherwise a raster image shows itself; otherwise the box.
  const displayUrl = item.coverImageUrl ?? item.thumbnailUrl;
  const thumb = displayUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={displayUrl}
      alt=""
      className="h-full w-full rounded-none object-cover"
      loading="lazy"
    />
  ) : (
    <FileTypeThumb type={item.type} className="h-full w-full rounded-none" />
  );

  const copyLink = async () => {
    if (!item.url) return;
    try {
      await navigator.clipboard.writeText(item.url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Couldn't copy the link");
    }
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
    <div className="group flex flex-col gap-3 rounded-xl bg-card p-3 shadow-[0_4px_24px_-6px_rgba(168,163,148,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-8px_rgba(168,163,148,0.5)]">
      {/* Framed thumbnail with a gentle hover zoom */}
      {item.previewable ? (
        <button
          type="button"
          onClick={() => onPreview(item)}
          className="relative aspect-[16/10] w-full cursor-zoom-in overflow-hidden rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          title="Click to view"
          aria-label={`Preview ${item.name}`}
        >
          <div className="size-full transition-transform duration-300 ease-out group-hover:scale-[1.05]">
            {thumb}
          </div>
        </button>
      ) : (
        <div className="aspect-[16/10] w-full overflow-hidden rounded-xl">
          <div className="size-full transition-transform duration-300 ease-out group-hover:scale-[1.05]">
            {thumb}
          </div>
        </div>
      )}

      {/* Title + meta */}
      <div className="px-1">
        <p className="truncate text-lg font-semibold tracking-tight text-foreground">{item.name}</p>
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
                size="sm"
                variant="outline"
                onClick={() => item.url && window.open(item.url, "_blank", "noopener,noreferrer")}
                disabled={!item.url}
              >
                <ExternalLink className="size-4" />
                Open
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="size-9 rounded-lg"
                onClick={copyLink}
                aria-label="Copy link"
              >
                <Copy className="size-4" />
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={download}
              disabled={!canDownload || downloading}
              title={canDownload ? undefined : "No file available"}
            >
              <Download className="size-4" />
              {downloading ? "Preparing…" : "Download"}
            </Button>
          )}
          {item.previewable ? (
            <Button
              size="icon"
              variant="outline"
              className="size-9 rounded-lg"
              onClick={() => onPreview(item)}
              aria-label={`Preview ${item.name}`}
              title="Preview"
            >
              <Eye className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
