import { List, Megaphone, Receipt, type LucideIcon } from "lucide-react";

/** A single entry in the partner sidebar navigation. */
export type PartnerNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Match the href exactly (no nested-route prefix) — use for index routes. */
  end?: boolean;
  /** Extra path prefixes that also mark this item active (e.g. detail pages). */
  match?: string[];
};

/** Partner portal navigation — the "Referral Program" section. */
export const PARTNER_NAV: PartnerNavItem[] = [
  // "My Referrals" lives at the panel index (/partner) but its detail pages are
  // under /partner/referrals/[id], so match that prefix too — without it the
  // exact-match `end` flag drops the highlight on referral detail pages.
  { label: "My Referrals", href: "/partner", icon: List, end: true, match: ["/partner/referrals"] },
  { label: "Payouts", href: "/partner/payouts", icon: Receipt },
  { label: "Marketing", href: "/partner/marketing", icon: Megaphone },
];
