"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ArrowRight, Check, Clock } from "lucide-react";
import { UserAvatar } from "@/components/custom/user-avatar";
import { Button } from "@/components/ui/button";
import type { PartnerListRow } from "@/lib/services/partner-service";
import { getInitials } from "@/lib/utils";
import { PartnerStatusDialog } from "./partner-status-dialog";

const fmtDate = (iso: string) => format(parseISO(iso), "MMM d, yyyy");

/** One applicant row: identity + meta on the left, View / Decline / Approve on the right. */
function PendingRow({ partner, tint }: { partner: PartnerListRow; tint: "gold" | "teal" }) {
  const router = useRouter();
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);

  const entryLabel = partner.entryType === "self_signup" ? "Self Sign-Up" : "Invited";
  const meta = [partner.companyName, entryLabel, partner.email]
    .filter((v) => v && v !== "—")
    .join(" · ");

  return (
    <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <UserAvatar initials={getInitials(partner.fullName)} size="sm" tint={tint} />
        <div className="min-w-0">
          <Link
            href={`/admin/partners/${partner.id}`}
            className="block truncate font-medium hover:underline"
            title={partner.fullName}
          >
            {partner.fullName}
          </Link>
          <p className="truncate text-sm text-muted-foreground" title={meta}>
            {meta}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <span className="hidden text-sm text-muted-foreground whitespace-nowrap sm:inline">
          Applied · {fmtDate(partner.joinedAt)}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/admin/partners/${partner.id}`)}
        >
          View
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setPending("reject")}
        >
          Decline
        </Button>
        <Button variant="success" size="sm" onClick={() => setPending("approve")}>
          <Check className="size-4" />
          Approve
        </Button>
      </div>

      <PartnerStatusDialog
        partnerId={partner.id}
        partnerName={partner.fullName}
        mode={pending ?? "approve"}
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
      />
    </li>
  );
}

/**
 * Inbox of partner applications awaiting review, shown above the main list — a
 * bordered action card with a header and one row per applicant. Renders nothing
 * when there are no pending applications.
 */
export function PendingApplications({ partners }: { partners: PartnerListRow[] }) {
  if (partners.length === 0) return null;

  return (
    <section aria-labelledby="pending-applications-heading">
      <div className="overflow-hidden rounded-xl border bg-card">
        {/* Header */}
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Clock className="size-4 text-[#8F5A0C]" />
          <h2 id="pending-applications-heading" className="text-base font-semibold">
            Pending applications
          </h2>
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F5EAD2] px-1.5 text-xs font-semibold text-[#8F5A0C]">
            {partners.length}
          </span>
          {partners.length > 1 && (
            <Link
              href="/admin/partners"
              className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Review all
              <ArrowRight className="size-3.5" />
            </Link>
          )}
        </div>

        {/* Applicant rows */}
        <ul className="divide-y">
          {partners.map((partner, i) => (
            <PendingRow key={partner.id} partner={partner} tint={i % 2 === 0 ? "gold" : "teal"} />
          ))}
        </ul>
      </div>
    </section>
  );
}
