"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileDropField } from "@/components/custom/file-drop-field";
import { CoverImageField } from "@/components/custom/cover-image-field";
import { FileTypeThumb } from "@/components/custom/file-type-thumb";
import { MarketingPreviewDialog } from "@/components/custom/marketing-preview-dialog";
import { RichTextEditor } from "@/components/custom/rich-text-editor";
import { useReplaceFileItem, useSetItemCover, useUpdateItem } from "@/lib/queries/hooks";
import {
  ACCEPT_ATTR,
  ACCEPT_COVER_ATTR,
  badgeFromFile,
  fileItemMetaSchema,
  linkItemSchema,
  validateCoverImage,
  validateFile,
  type FileItemFormData,
  type LinkItemFormData,
} from "@/lib/validations/marketing";
import type { EnrichedMarketingItem } from "@/app/actions/marketing";

const DESC_PLACEHOLDER = "Describe this resource for partners…";

/**
 * Shared cover-image edit state for both the link and file edit forms. Tracks a
 * newly-picked file vs. a "remove existing" intent, resets when the dialog
 * (re)opens, and exposes `field` props for `CoverImageField` plus a `persist()`
 * that only calls the set-cover mutation when something actually changed.
 */
function useCoverEditState(item: EnrichedMarketingItem, open: boolean) {
  const setCover = useSetItemCover();
  const [file, setFile] = useState<File | null>(null);
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the picker when the dialog (re)opens — the render-time "adjust state on
  // prop change" pattern (https://react.dev/learn/you-might-not-need-an-effect).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setFile(null);
      setRemoved(false);
      setError(null);
    }
  }

  const onSelect = (picked: File | null) => {
    if (!picked) {
      setFile(null);
      setError(null);
      return;
    }
    const check = validateCoverImage({ name: picked.name, size: picked.size });
    if (!check.ok) {
      setFile(null);
      setError(check.error);
      return;
    }
    setError(null);
    setRemoved(false);
    setFile(picked);
  };

  const onRemove = () => {
    if (file) {
      // Discard the pending pick, revert to the current image.
      setFile(null);
      setError(null);
    } else if (item.coverImagePath || item.thumbnailUrl) {
      // Remove the cover entirely — the card falls back to the type placeholder
      // (this also suppresses an image file's own auto thumbnail).
      setRemoved(true);
    }
  };

  const persist = async (target: EnrichedMarketingItem) => {
    if (file) {
      await setCover.mutateAsync({ id: target.id, sectionId: target.sectionId, file });
    } else if (removed) {
      // file:null clears any explicit cover AND sets cover_hidden (server-side).
      await setCover.mutateAsync({ id: target.id, sectionId: target.sectionId, file: null });
    }
  };

  // The effective current image: an explicit cover wins; otherwise the file's own
  // raster thumbnail (image files show themselves). Removing shows the placeholder.
  const currentUrl = removed ? null : (item.coverImageUrl ?? item.thumbnailUrl);
  const removable = !removed && (!!item.coverImagePath || !!item.thumbnailUrl);

  return {
    field: {
      file,
      onSelect,
      currentUrl,
      placeholder: <FileTypeThumb type={item.type} className="h-full w-full rounded-none" />,
      removable,
      onRemove,
      error,
    },
    /** A pending cover change (new pick or a removal). */
    dirty: !!file || removed,
    persist,
    busy: setCover.isPending,
  };
}

export function EditItemDialog({
  item,
  open,
  onOpenChange,
}: {
  item: EnrichedMarketingItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // The active form reports its unsaved-changes state here; the guarded close reads
  // it to decide whether to confirm before discarding (Cancel / X / Esc / overlay).
  const dirtyRef = useRef(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const requestClose = (next: boolean) => {
    if (!next && dirtyRef.current) {
      setConfirmOpen(true);
      return;
    }
    onOpenChange(next);
  };

  const discardAndClose = () => {
    setConfirmOpen(false);
    dirtyRef.current = false;
    onOpenChange(false);
  };

  // A successful save closes without the discard prompt.
  const closeSaved = () => {
    dirtyRef.current = false;
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit {item.kind === "link" ? "link" : "file"}</DialogTitle>
          <DialogDescription>Update the details partners see.</DialogDescription>
        </DialogHeader>

        {item.kind === "link" ? (
          <EditLinkForm
            item={item}
            open={open}
            onOpenChange={requestClose}
            onSaved={closeSaved}
            dirtyRef={dirtyRef}
          />
        ) : (
          // Remount per open so the picked-file state starts fresh each time (avoids a
          // setState-in-effect reset).
          <EditFileForm
            key={`${item.id}:${open}`}
            item={item}
            open={open}
            onOpenChange={requestClose}
            onSaved={closeSaved}
            dirtyRef={dirtyRef}
          />
        )}

        {/* Nested INSIDE DialogContent (not a sibling) so Radix layers it as the top
            interactive layer — a sibling AlertDialog gets scroll-locked/inert. */}
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Discard changes?</AlertDialogTitle>
              <AlertDialogDescription>
                You have unsaved changes. If you close now, they’ll be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep editing</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={discardAndClose}>
                Discard changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}

function EditLinkForm({
  item,
  open,
  onOpenChange,
  onSaved,
  dirtyRef,
}: {
  item: EnrichedMarketingItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  dirtyRef: RefObject<boolean>;
}) {
  const update = useUpdateItem();
  const form = useForm<LinkItemFormData>({
    resolver: zodResolver(linkItemSchema),
    defaultValues: {
      name: item.name,
      url: item.url ?? "",
      description: item.description ?? "",
    },
  });
  const cover = useCoverEditState(item, open);

  useEffect(() => {
    if (open) {
      form.reset({ name: item.name, url: item.url ?? "", description: item.description ?? "" });
    }
  }, [open, item, form]);

  // Report unsaved changes upward so the dialog can confirm before closing.
  const dirty = form.formState.isDirty || cover.dirty;
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty, dirtyRef]);

  const onSubmit = async (values: LinkItemFormData) => {
    try {
      await cover.persist(item);
      await update.mutateAsync({
        id: item.id,
        input: { name: values.name, url: values.url, description: values.description },
      });
      toast.success("Link updated");
      onSaved(); // saved — close without a discard prompt
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save changes");
    }
  };

  const busy = update.isPending || cover.busy;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Link title *</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <RichTextEditor
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder={DESC_PLACEHOLDER}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <CoverImageField id="edit-link-cover" accept={ACCEPT_COVER_ATTR} {...cover.field} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function EditFileForm({
  item,
  open,
  onOpenChange,
  onSaved,
  dirtyRef,
}: {
  item: EnrichedMarketingItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  dirtyRef: RefObject<boolean>;
}) {
  const update = useUpdateItem();
  const replace = useReplaceFileItem();
  const form = useForm<FileItemFormData>({
    resolver: zodResolver(fileItemMetaSchema),
    defaultValues: { name: item.name, description: item.description ?? "" },
  });
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const cover = useCoverEditState(item, open);

  // The component is remounted per open (keyed in the parent), so file state starts
  // fresh; this only re-syncs the text fields if `item` changes while mounted.
  useEffect(() => {
    if (open) form.reset({ name: item.name, description: item.description ?? "" });
  }, [open, item, form]);

  const onPickFile = (picked: File | null) => {
    if (!picked) {
      setFile(null);
      setFileError(null);
      return;
    }
    const check = validateFile({ name: picked.name, size: picked.size });
    if (!check.ok) {
      setFile(null);
      setFileError(check.error);
      return;
    }
    setFileError(null);
    setFile(picked);
  };

  // Report unsaved changes upward so the dialog can confirm before closing.
  const dirty = form.formState.isDirty || !!file || cover.dirty;
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty, dirtyRef]);

  const onSubmit = async (values: FileItemFormData) => {
    try {
      // Replace the underlying file first (when a new one was picked), then the
      // cover, then save metadata.
      if (file) {
        await replace.mutateAsync({ id: item.id, sectionId: item.sectionId, file });
      }
      await cover.persist(item);
      await update.mutateAsync({
        id: item.id,
        input: { name: values.name, description: values.description },
      });
      toast.success(file ? "File replaced" : "File updated");
      onSaved(); // saved — close without a discard prompt
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save changes");
    }
  };

  const busy = update.isPending || replace.isPending || cover.busy;
  const badge = file ? badgeFromFile(file.name) : null;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FileDropField
          id="replace-file"
          accept={ACCEPT_ATTR}
          onSelect={onPickFile}
          selectedFile={file}
          selectedBadge={badge}
          currentFileName={item.fileName}
          onViewCurrent={item.fileName ? () => setPreviewOpen(true) : undefined}
          helpText="Choose a new file to replace it, or leave blank to keep the current one."
          error={fileError}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name *</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <RichTextEditor
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder={DESC_PLACEHOLDER}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <CoverImageField id="edit-file-cover" accept={ACCEPT_COVER_ATTR} {...cover.field} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </form>

      <MarketingPreviewDialog
        item={previewOpen ? item : null}
        onOpenChange={(o) => !o && setPreviewOpen(false)}
      />
    </Form>
  );
}
