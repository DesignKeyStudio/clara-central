"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
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
import { RichTextEditor } from "@/components/custom/rich-text-editor";
import { useCreateFileItem, useCreateLinkItem } from "@/lib/queries/hooks";
import {
  ACCEPT_ATTR,
  ACCEPT_COVER_ATTR,
  badgeFromFile,
  fileItemMetaSchema,
  isInlineImage,
  linkItemSchema,
  validateCoverImage,
  validateFile,
  type FileItemFormData,
  type LinkItemFormData,
} from "@/lib/validations/marketing";

const DESC_PLACEHOLDER = "Describe this resource for partners…";

export function CreateItemDialog({
  sectionId,
  kind,
  open,
  onOpenChange,
}: {
  sectionId: string;
  kind: "file" | "link";
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

  // A successful create closes without the discard prompt.
  const closeSaved = () => {
    dirtyRef.current = false;
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{kind === "file" ? "Upload a file" : "Add a link"}</DialogTitle>
          <DialogDescription>
            {kind === "file"
              ? "Attach a file and give it a display name."
              : "Link out to an external resource."}
          </DialogDescription>
        </DialogHeader>

        {kind === "file" ? (
          // Remount per open so picked-file/cover state starts fresh each time.
          <FileItemForm
            key={String(open)}
            sectionId={sectionId}
            onOpenChange={requestClose}
            onSaved={closeSaved}
            dirtyRef={dirtyRef}
          />
        ) : (
          <LinkItemForm
            key={String(open)}
            sectionId={sectionId}
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

function FileItemForm({
  sectionId,
  onOpenChange,
  onSaved,
  dirtyRef,
}: {
  sectionId: string;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  dirtyRef: RefObject<boolean>;
}) {
  const create = useCreateFileItem();
  const form = useForm<FileItemFormData>({
    resolver: zodResolver(fileItemMetaSchema),
    defaultValues: { name: "", description: "" },
  });
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  // True when the admin removed the auto cover for an image file → force the placeholder.
  const [coverRemoved, setCoverRemoved] = useState(false);

  const onPickCover = (picked: File | null) => {
    if (!picked) {
      setCover(null);
      setCoverError(null);
      return;
    }
    const check = validateCoverImage({ name: picked.name, size: picked.size });
    if (!check.ok) {
      setCover(null);
      setCoverError(check.error);
      return;
    }
    setCoverError(null);
    setCoverRemoved(false);
    setCover(picked);
  };

  const onRemoveCover = () => {
    if (cover) {
      // Discard the pending pick, revert to the file's own image.
      setCover(null);
      setCoverError(null);
    } else {
      // Suppress the auto cover — the card will show the type placeholder instead.
      setCoverRemoved(true);
    }
  };

  const onPickFile = (picked: File | null) => {
    // A new/cleared main file starts the cover fresh.
    setCoverRemoved(false);
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
    // Pre-fill the display name from the filename when empty (mirrors the prototype).
    if (!form.getValues("name").trim()) {
      form.setValue("name", picked.name.replace(/\.[^.]+$/, ""), { shouldValidate: true });
    }
  };

  const onSubmit = (values: FileItemFormData) => {
    if (!file) {
      setFileError("Choose a file to upload");
      return;
    }
    create.mutate(
      { sectionId, file, name: values.name, description: values.description, cover, coverHidden: coverRemoved },
      {
        onSuccess: () => {
          toast.success("File added");
          onSaved(); // created — close without a discard prompt
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const badge = file ? badgeFromFile(file.name) : null;

  // Report unsaved changes upward so the dialog can confirm before closing.
  const dirty = form.formState.isDirty || !!file || !!cover || coverRemoved;
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty, dirtyRef]);

  // A picked raster image doubles as its own cover — preview it so the admin sees
  // they don't need a separate upload (but can still Replace to override).
  const autoCoverUrl = useMemo(
    () => (file && isInlineImage(file.name) ? URL.createObjectURL(file) : null),
    [file],
  );
  useEffect(() => {
    if (!autoCoverUrl) return;
    return () => URL.revokeObjectURL(autoCoverUrl);
  }, [autoCoverUrl]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FileDropField
          id="marketing-file"
          accept={ACCEPT_ATTR}
          onSelect={onPickFile}
          selectedFile={file}
          selectedBadge={badge}
          helpText="PDF, PPTX, DOCX, XLSX, images, or ZIP — up to 50 MB."
          error={fileError}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name *</FormLabel>
              <FormControl>
                <Input placeholder="Pricing one-pager" {...field} />
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

        <CoverImageField
          id="marketing-file-cover"
          accept={ACCEPT_COVER_ATTR}
          file={cover}
          onSelect={onPickCover}
          currentUrl={coverRemoved ? null : autoCoverUrl}
          placeholder={
            badge ? <FileTypeThumb type={badge} className="h-full w-full rounded-none" /> : undefined
          }
          removable={!!autoCoverUrl && !coverRemoved}
          onRemove={onRemoveCover}
          error={coverError}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending || !file}>
            {create.isPending ? "Uploading…" : "Add File"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function LinkItemForm({
  sectionId,
  onOpenChange,
  onSaved,
  dirtyRef,
}: {
  sectionId: string;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  dirtyRef: RefObject<boolean>;
}) {
  const create = useCreateLinkItem();
  const form = useForm<LinkItemFormData>({
    resolver: zodResolver(linkItemSchema),
    defaultValues: { name: "", url: "", description: "" },
  });
  const [cover, setCover] = useState<File | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);

  const onPickCover = (picked: File | null) => {
    if (!picked) {
      setCover(null);
      setCoverError(null);
      return;
    }
    const check = validateCoverImage({ name: picked.name, size: picked.size });
    if (!check.ok) {
      setCover(null);
      setCoverError(check.error);
      return;
    }
    setCoverError(null);
    setCover(picked);
  };

  const onSubmit = (values: LinkItemFormData) => {
    create.mutate(
      { sectionId, ...values, cover },
      {
        onSuccess: () => {
          toast.success("Link added");
          onSaved(); // created — close without a discard prompt
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  // Report unsaved changes upward so the dialog can confirm before closing.
  const dirty = form.formState.isDirty || !!cover;
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty, dirtyRef]);

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
                <Input placeholder="Payroll & tax FAQ" {...field} />
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

        <CoverImageField
          id="marketing-link-cover"
          accept={ACCEPT_COVER_ATTR}
          file={cover}
          onSelect={onPickCover}
          placeholder={<FileTypeThumb type="LINK" className="h-full w-full rounded-none" />}
          onRemove={() => onPickCover(null)}
          error={coverError}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Adding…" : "Add Link"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
