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
import { useDeleteReferral } from "@/lib/queries/hooks";

/** "1 invoice" / "3 invoices" — pluralizes the noun for the cascade summary. */
function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

/**
 * Destructive confirmation for permanently deleting a referral. Spells out the
 * cascade (its invoices) and notes that recorded payouts are kept at the partner
 * level. On confirm, navigates back to the referrals list with a toast.
 */
export function DeleteReferralDialog({
  referralId,
  partnerId,
  contactName,
  invoiceCount,
  open,
  onOpenChange,
}: {
  referralId: string;
  partnerId: string;
  contactName: string;
  invoiceCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const del = useDeleteReferral(referralId, partnerId);

  const onConfirm = () => {
    del.mutate(undefined, {
      onSuccess: () => {
        toast.success(`Referral for ${contactName} deleted`);
        onOpenChange(false);
        router.push("/admin/referrals");
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
            This permanently deletes the referral for {contactName} along with its{" "}
            {count(invoiceCount, "invoice")}. Any recorded payouts are kept at the partner level.
            This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm} disabled={del.isPending}>
            {del.isPending ? "Deleting…" : "Delete Referral"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
