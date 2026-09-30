"use client";

import { useState } from "react";
import { format, formatDistanceToNowStrict, parseISO } from "date-fns";
import { Copy, Mail, RefreshCw, Ban } from "lucide-react";
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
import { UserAvatar } from "@/components/custom/user-avatar";
import { Button } from "@/components/ui/button";
import { useInvites, useResendInvite, useRevokeInvite } from "@/lib/queries/hooks";
import type { InviteListRow } from "@/lib/services/invite-service";
import { cn, getInitials } from "@/lib/utils";

const fmtDate = (iso: string) => format(parseISO(iso), "MMM d, yyyy");

/** Pending / Expired pill for an invite's state. */
function InviteStatus({ isExpired }: { isExpired: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        isExpired
          ? "bg-destructive/10 text-destructive"
          : "bg-[#F5EAD2] text-[#8F5A0C]",
      )}
    >
      {isExpired ? "Expired" : "Pending"}
    </span>
  );
}

/** One invitation row: identity + meta on the left, status/expiry + actions on the right. */
function InviteRow({ invite, tint }: { invite: InviteListRow; tint: "gold" | "teal" }) {
  const resend = useResendInvite();
  const revoke = useRevokeInvite();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const meta = [invite.companyName, invite.invitedByName ? `Invited by ${invite.invitedByName}` : null]
    .filter(Boolean)
    .join(" · ");

  const expiryLabel = invite.expiresAt
    ? invite.isExpired
      ? `Expired ${fmtDate(invite.expiresAt)}`
      : `Expires in ${formatDistanceToNowStrict(parseISO(invite.expiresAt))}`
    : "No expiry";

  const onCopyLink = async () => {
    const link = `${window.location.origin}/invite/${invite.token}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Invite link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  const onResend = () =>
    resend.mutate(invite.id, {
      onSuccess: (res) =>
        toast.success(res.emailed ? "Invitation resent" : "Expiry refreshed — copy the link to share"),
      onError: (e) => toast.error(e.message),
    });

  const onRevoke = () =>
    revoke.mutate(invite.id, {
      onSuccess: () => {
        toast.success("Invitation revoked");
        setConfirmOpen(false);
      },
      onError: (e) => toast.error(e.message),
    });

  return (
    <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <UserAvatar initials={getInitials(invite.fullName || invite.email)} size="sm" tint={tint} />
        <div className="min-w-0">
          <p className="truncate font-medium" title={invite.fullName ?? invite.email}>
            {invite.fullName ?? invite.email}
          </p>
          <p className="truncate text-sm text-muted-foreground" title={[invite.email, meta].filter(Boolean).join(" · ")}>
            {[invite.email, meta].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2">
          <InviteStatus isExpired={invite.isExpired} />
          <span className="hidden text-sm text-muted-foreground whitespace-nowrap md:inline">
            {expiryLabel}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onResend} disabled={resend.isPending}>
          <RefreshCw className="size-4" />
          Resend
        </Button>
        <Button variant="ghost" size="sm" onClick={onCopyLink}>
          <Copy className="size-4" />
          Copy link
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setConfirmOpen(true)}
        >
          <Ban className="size-4" />
          Revoke
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              The invite link for {invite.email} will stop working. You can invite this email
              again afterwards. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onRevoke} disabled={revoke.isPending}>
              {revoke.isPending ? "Revoking…" : "Revoke invitation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

/**
 * Outstanding partner invitations (sent but not yet accepted), shown above the main
 * list so admins can see who's been invited and resend / copy-link / revoke. Renders
 * nothing when there are no pending invites.
 */
export function InvitationsSection() {
  const { data: invites = [] } = useInvites();
  if (invites.length === 0) return null;

  return (
    <section aria-labelledby="invitations-heading">
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Mail className="size-4 text-[#8F5A0C]" />
          <h2 id="invitations-heading" className="text-base font-semibold">
            Invitations
          </h2>
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F5EAD2] px-1.5 text-xs font-semibold text-[#8F5A0C]">
            {invites.length}
          </span>
        </div>
        <ul className="divide-y">
          {invites.map((invite, i) => (
            <InviteRow key={invite.id} invite={invite} tint={i % 2 === 0 ? "gold" : "teal"} />
          ))}
        </ul>
      </div>
    </section>
  );
}
