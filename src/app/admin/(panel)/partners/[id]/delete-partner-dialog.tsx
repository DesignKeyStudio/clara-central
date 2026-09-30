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
import { useDeletePartner } from "@/lib/queries/hooks";

/** "1 referral" / "3 referrals" — pluralizes the noun for the cascade summary. */
function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

/**
 * Destructive confirmation for permanently deleting a partner. Spells out the
 * cascade (their referrals, invoices, and payouts) so the admin knows exactly what
 * gets removed. On confirm, navigates back to the partners list with a toast.
 */
export function DeletePartnerDialog({
  partnerId,
  partnerName,
  referralCount,
  invoiceCount,
  payoutCount,
  open,
  onOpenChange,
}: {
  partnerId: string;
  partnerName: string;
  referralCount: number;
  invoiceCount: number;
  payoutCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const del = useDeletePartner();

  const onConfirm = () => {
    del.mutate(partnerId, {
      onSuccess: () => {
        toast.success(`${partnerName} deleted`);
        onOpenChange(false);
        router.push("/admin/partners");
      },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="break-words">Delete {partnerName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the partner along with their{" "}
            {count(referralCount, "referral")}, {count(invoiceCount, "invoice")}, and{" "}
            {count(payoutCount, "payout")}. They&apos;ll no longer be able to sign in. This can&apos;t
            be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm} disabled={del.isPending}>
            {del.isPending ? "Deleting…" : "Delete Partner"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
