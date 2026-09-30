"use client";

import { useRouter } from "next/navigation";
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
import { useDeleteMyReferral } from "@/lib/queries/hooks";

/**
 * Destructive confirmation for a partner deleting their own referral — allowed only
 * while it's still in the Submitted stage (the caller only renders the trigger for
 * submitted referrals; the server re-checks). Pass `redirectTo` from the detail page
 * to navigate away after deletion; the list omits it (the row just disappears).
 */
export function DeleteMyReferralDialog({
  referralId,
  contactName,
  open,
  onOpenChange,
  redirectTo,
}: {
  referralId: string;
  contactName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectTo?: string;
}) {
  const router = useRouter();
  const del = useDeleteMyReferral();

  const onConfirm = () => {
    del.mutate(referralId, {
      onSuccess: () => {
        toast.success(`Referral for ${contactName} deleted`);
        onOpenChange(false);
        if (redirectTo) router.push(redirectTo);
      },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this referral?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes your referral for {contactName}. You can only delete a
            referral while it&apos;s still in the Submitted stage. This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm} disabled={del.isPending}>
            {del.isPending ? "Deleting…" : "Delete referral"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
