"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import { ImagePlus, Trash2, UploadCloud } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Cover-image picker that mirrors exactly what the marketing card will show. The
 * 16:10 preview resolves in the same order as the card: newly-picked file → the
 * resolved current image (`currentUrl` — an explicit cover, or the file's own
 * raster image) → the type `placeholder` (the PDF/LINK/… box). Only when there's
 * nothing to show at all does it fall back to an empty dropzone.
 *
 * A cover is always optional: an admin can upload one to replace the placeholder,
 * or leave it. `removable` marks a *removable* explicit cover (Replace + Remove);
 * an intrinsic auto image or a placeholder offers upload/replace only — there's
 * nothing to "remove" back to. Presentational — the parent owns validation/state.
 */
export function CoverImageField({
  id = "cover-image",
  label = "Cover image",
  accept,
  file,
  onSelect,
  currentUrl,
  placeholder,
  removable = false,
  onRemove,
  helpText = "Optional. PNG or JPG, up to 5 MB — shown as the card image.",
  error,
}: {
  id?: string;
  label?: string;
  accept: string;
  file: File | null;
  onSelect: (file: File | null) => void;
  currentUrl?: string | null;
  /** Fallback preview (the file-type box) shown when there's no cover/auto image. */
  placeholder?: ReactNode;
  removable?: boolean;
  onRemove: () => void;
  helpText?: string;
  error?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // Object URL for the newly-picked file's preview; revoked when it changes/unmounts.
  const objectUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    if (!objectUrl) return;
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  const imageUrl = objectUrl ?? currentUrl ?? null;
  // A pending pick can always be discarded; a resolved current image is removable
  // when the parent says so (an explicit cover, or a file's own auto image that can
  // be suppressed back to the type placeholder).
  const showRemove = !!objectUrl || removable;

  const openPicker = () => inputRef.current?.click();
  const clear = () => {
    onRemove();
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    onSelect(e.dataTransfer.files?.[0] ?? null);
  };
  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  const onDragLeave = () => setDragOver(false);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>

      {imageUrl ? (
        // An actual image (picked cover, explicit cover, or the file's own image),
        // with Replace / Remove overlaid on the image itself.
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border bg-muted/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Cover preview" className="h-full w-full object-cover" />
          <div className="absolute right-2 top-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={openPicker}
              className="inline-flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/75"
            >
              <ImagePlus className="size-3.5" />
              Replace
            </button>
            {showRemove ? (
              <button
                type="button"
                onClick={clear}
                className="inline-flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-destructive"
              >
                <Trash2 className="size-3.5" />
                Remove cover
              </button>
            ) : null}
          </div>
        </div>
      ) : placeholder ? (
        // No image yet — show the same type placeholder the card uses, with an
        // always-visible "Upload cover" chip on it; a cover is optional.
        <div className="space-y-2">
          <button
            type="button"
            onClick={openPicker}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={cn(
              "group relative block aspect-[16/10] w-full overflow-hidden rounded-xl border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              dragOver && "border-primary",
            )}
            aria-label="Upload a cover image"
          >
            {placeholder}
            <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm transition-colors group-hover:bg-black/75">
              <ImagePlus className="size-3.5" />
              Upload cover
            </span>
          </button>
          <p className="text-xs text-muted-foreground">
            Optional — upload an image to replace this placeholder on the card.
          </p>
        </div>
      ) : (
        // Nothing to preview at all — plain dropzone.
        <button
          type="button"
          onClick={openPicker}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            "flex aspect-[16/10] w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-6 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
            dragOver
              ? "border-primary bg-accent/60"
              : "border-input hover:border-[#D8D4CC] hover:bg-muted/40",
          )}
        >
          <UploadCloud className="size-6 text-muted-foreground" aria-hidden />
          <span className="text-sm text-muted-foreground">
            <span className="font-medium text-primary">Click to upload</span> or drag and drop
          </span>
          <span className="text-xs text-muted-foreground">{helpText}</span>
        </button>
      )}

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onSelect(e.target.files?.[0] ?? null)}
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
