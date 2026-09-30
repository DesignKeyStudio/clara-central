import {
  LayoutDashboard,
  List,
  Megaphone,
  Receipt,
  ScrollText,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

/** A single entry in the admin sidebar navigation. */
export type AdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Match the href exactly (no nested-route prefix) — use for index routes like the dashboard. */
  end?: boolean;
};

/** Admin portal navigation — the "Referral Program" section. */
export const ADMIN_NAV: AdminNavItem[] = [
  // `end` keeps the dashboard from staying active on every nested /admin/* route.
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, end: true },
  { label: "Partners", href: "/admin/partners", icon: Users },
  { label: "Referrals", href: "/admin/referrals", icon: List },
  { label: "Payouts", href: "/admin/payouts", icon: Receipt },
  { label: "Marketing", href: "/admin/marketing", icon: Megaphone },
  { label: "Activity", href: "/admin/audit-log", icon: ScrollText },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];
