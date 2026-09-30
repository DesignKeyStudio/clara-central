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
import { useDeleteItem } from "@/lib/queries/hooks";

export function DeleteItemDialog({
  itemId,
  itemName,
  isFile,
  open,
  onOpenChange,
}: {
  itemId: string;
  itemName: string;
  isFile: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const del = useDeleteItem();

  const onConfirm = () => {
    del.mutate(itemId, {
      onSuccess: () => {
        toast.success("Item deleted");
        onOpenChange(false);
      },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="break-words">Delete “{itemName}”?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the item{isFile ? " and its uploaded file from storage" : ""}. This can’t be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm} disabled={del.isPending}>
            {del.isPending ? "Deleting…" : "Delete Item"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
