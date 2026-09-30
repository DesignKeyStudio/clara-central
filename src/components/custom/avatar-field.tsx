"use client";

import { useRef, type ChangeEvent } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { UserAvatar } from "@/components/custom/user-avatar";
import { Button } from "@/components/ui/button";
import { ACCEPT_COVER_ATTR } from "@/lib/validations/marketing";

/**
 * Round profile-picture picker. Shows the current avatar (initials fallback) with
 * Change / Remove controls. Presentational — the parent owns the upload mutation
 * and surfaces errors; picking a file calls `onSelect(file)` immediately (the
 * upload happens right away, so there's no pending-file preview to manage).
 */
export function AvatarField({
  currentUrl,
  initials,
  onSelect,
  onRemove,
  uploading = false,
  disabled = false,
}: {
  currentUrl: string | null;
  initials: string;
  onSelect: (file: File) => void;
  onRemove: () => void;
  uploading?: boolean;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = uploading || disabled;

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onSelect(file);
    e.target.value = "";
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <UserAvatar initials={initials} size="lg" imageUrl={currentUrl} tint="teal" />
        {uploading ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <Loader2 className="size-5 animate-spin text-white" />
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <Camera className="size-4" />
            {currentUrl ? "Change photo" : "Upload photo"}
          </Button>
          {currentUrl ? (
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onRemove}>
              <Trash2 className="size-4" />
              Remove
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">PNG or JPG, up to 5 MB.</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_COVER_ATTR}
        className="hidden"
        onChange={onChange}
      />
    </div>
  );
}
