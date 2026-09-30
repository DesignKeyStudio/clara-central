"use client";

import { useRef, useState, type DragEvent } from "react";
import { Eye, FileText, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extBadge(name: string): string | null {
  const ext = name.split(".").pop();
  return ext ? ext.toUpperCase() : null;
}

/**
 * Styled file picker with a single file slot. Empty → a click-or-drag dropzone.
 * Once a file exists (a newly picked one, or the existing `currentFileName` in
 * replace flows) it shows one chip — icon + type badge + name (+ size for a new
 * pick) — with Replace / View actions. Picking a new file replaces the current
 * one in place (never two files at once); the clear "✕" reverts to the current.
 * Presentational — the parent owns validation and the selected `File` state.
 */
export function FileDropField({
  id,
  label = "File",
  accept,
  onSelect,
  selectedFile,
  selectedBadge,
  currentFileName,
  onViewCurrent,
  helpText,
  error,
}: {
  id?: string;
  label?: string;
  accept: string;
  onSelect: (file: File | null) => void;
  selectedFile?: File | null;
  selectedBadge?: string | null;
  currentFileName?: string | null;
  /** When set, a "View" button on the current file opens it (preview/new tab). */
  onViewCurrent?: () => void;
  helpText?: string;
  error?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const openPicker = () => inputRef.current?.click();
  const clearNew = () => {
    onSelect(null);
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

  const hasNew = !!selectedFile;
  const hasCurrent = !hasNew && !!currentFileName;
  const name = hasNew ? selectedFile!.name : currentFileName ?? "";
  const badge = hasNew ? selectedBadge ?? extBadge(name) : currentFileName ? extBadge(currentFileName) : null;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>

      {hasNew || hasCurrent ? (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            "flex items-center gap-3 rounded-md border bg-muted/30 p-3 transition-colors",
            dragOver && "border-primary bg-accent/60",
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground">
            <FileText className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {badge ? (
                <span className="mr-1.5 text-xs font-semibold uppercase text-primary">{badge}</span>
              ) : null}
              {name}
            </p>
            <p className="text-xs text-muted-foreground">
              {hasNew ? formatBytes(selectedFile!.size) : "Current file"}
            </p>
          </div>

          {hasCurrent && onViewCurrent ? (
            <Button type="button" variant="outline" size="sm" onClick={onViewCurrent} className="shrink-0">
              <Eye className="size-4" />
              View
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={openPicker} className="shrink-0">
            Replace
          </Button>
          {hasNew ? (
            <button
              type="button"
              onClick={clearNew}
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Discard new file"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-1.5 rounded-md border border-dashed px-4 py-6 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
            dragOver ? "border-primary bg-accent/60" : "border-input hover:border-[#D8D4CC] hover:bg-muted/40",
          )}
        >
          <UploadCloud className="size-6 text-muted-foreground" aria-hidden />
          <span className="text-sm text-muted-foreground">
            <span className="font-medium text-primary">Click to upload</span> or drag and drop
          </span>
          {helpText ? <span className="text-xs text-muted-foreground">{helpText}</span> : null}
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

      {helpText && (hasNew || hasCurrent) ? (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
