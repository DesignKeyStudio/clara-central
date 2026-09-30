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
import { useSetPartnerStatus } from "@/lib/queries/hooks";

/**
 * Confirmation dialog for approving or declining a pending partner. Shared by the
 * Partners list row actions and the partner detail header — both gate the status
 * mutation behind this dialog (spec: approve/decline must confirm first). The
 * "reject" mode still maps to the `rejected` status internally.
 */
export function PartnerStatusDialog({
  partnerId,
  partnerName,
  mode,
  open,
  onOpenChange,
}: {
  partnerId: string;
  partnerName: string;
  mode: "approve" | "reject";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const setStatus = useSetPartnerStatus();
  const isApprove = mode === "approve";

  const onConfirm = () => {
    setStatus.mutate(
      { id: partnerId, status: isApprove ? "approved" : "rejected" },
      {
        onSuccess: () => {
          toast.success(isApprove ? "Partner approved." : "Partner declined.");
          onOpenChange(false);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="break-words">
            {isApprove ? "Approve" : "Decline"} {partnerName}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isApprove
              ? "They'll be able to log in to the Partner Portal and start referring."
              : "They'll be hidden from the partner list and won't be able to log in. You can't undo this."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={isApprove ? "success" : "destructive"}
            onClick={onConfirm}
            disabled={setStatus.isPending}
          >
            {setStatus.isPending
              ? isApprove
                ? "Approving…"
                : "Declining…"
              : isApprove
                ? "Approve"
                : "Decline"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
