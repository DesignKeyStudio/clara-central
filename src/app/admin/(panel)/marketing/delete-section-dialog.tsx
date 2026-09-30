"use client";

import { toast } from "sonner";
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
import { useDeleteSection } from "@/lib/queries/hooks";

export function DeleteSectionDialog({
  sectionId,
  sectionTitle,
  itemCount,
  open,
  onOpenChange,
}: {
  sectionId: string;
  sectionTitle: string;
  itemCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const del = useDeleteSection();

  const onConfirm = () => {
    del.mutate(sectionId, {
      onSuccess: () => {
        toast.success("Section deleted");
        onOpenChange(false);
      },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="break-words">Delete “{sectionTitle}”?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the section and all {itemCount} item{itemCount === 1 ? "" : "s"} inside it,
            including any uploaded files. This can’t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm} disabled={del.isPending}>
            {del.isPending ? "Deleting…" : "Delete Section"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
