"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchMarketingDownloadUrl, fetchMarketingPreviewUrl } from "@/lib/queries/hooks";
import { isInlineImage } from "@/lib/validations/marketing";

/**
 * Minimal shape a marketing file item needs to be previewed — satisfied by both
 * the plain `MarketingItemView` and the `EnrichedMarketingItem` used by the lists.
 */
export type PreviewItem = { id: string; name: string; fileName: string | null };

/**
 * In-app preview for an image (`<img>`) or PDF (`<iframe>`), shared by the admin
 * Marketing authoring page and the partner read-only library. The inline signed
 * URL is minted on open (never cached). The dialog is open whenever `item` is
 * non-null; closing clears it via `onOpenChange`.
 */
export function MarketingPreviewDialog({
  item,
  onOpenChange,
}: {
  item: PreviewItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const itemId = item?.id ?? null;
  const isImage = item ? isInlineImage(item.fileName ?? "") : false;

  useEffect(() => {
    if (!itemId) return;
    let active = true;
    setUrl(null);
    setError(null);
    fetchMarketingPreviewUrl(itemId)
      .then((u) => active && setUrl(u))
      .catch((e: unknown) =>
        active && setError(e instanceof Error ? e.message : "Couldn't load the preview"),
      );
    return () => {
      active = false;
    };
  }, [itemId]);

  const download = async () => {
    if (!item) return;
    setDownloading(true);
    try {
      const u = await fetchMarketingDownloadUrl(item.id);
      window.open(u, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't get the file");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{item?.name ?? "Preview"}</DialogTitle>
          <DialogDescription className="sr-only">
            Preview of {item?.name ?? "the selected file"}
          </DialogDescription>
        </DialogHeader>

        {/* Fixed-height viewport so the popup keeps one size across the loading →
            loaded transition and regardless of image aspect ratio (no reflow). */}
        <div className="flex h-[70vh] items-center justify-center overflow-hidden rounded-md bg-muted/30">
          {error ? (
            <p className="p-6 text-sm text-destructive">{error}</p>
          ) : !url ? (
            <Skeleton className="size-full" />
          ) : isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={item?.name ?? ""}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <iframe src={url} title={item?.name ?? "Preview"} className="size-full border-0" />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={download} disabled={downloading}>
            <Download className="size-4" />
            {downloading ? "Preparing…" : "Download"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
