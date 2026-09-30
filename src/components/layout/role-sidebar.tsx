"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, type LucideIcon } from "lucide-react";
import { signOutAction } from "@/app/actions/auth";
import { BrandMark } from "@/components/layout/brand-mark";
import { HeaderUserMenu } from "@/components/layout/header-user-menu";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { resolveHeaderDisplay } from "@/lib/header/header-user-display";
import { cn, getInitials } from "@/lib/utils";
import type { PlatformServerUser } from "@/types";

/** One navigation entry. `end` restricts matching to the exact href (index routes). */
export type RoleNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  end?: boolean;
  /**
   * Extra path prefixes that also mark this item active. Use when an item's
   * detail pages live under a different prefix than its href — e.g. the partner
   * "My Referrals" tab is `/partner` but its detail pages are `/partner/referrals/[id]`.
   */
  match?: string[];
};

/**
 * Config-driven left sidebar shared by both portals: brand + portal label, a
 * nav section (active state from the current path), and an account menu pinned
 * to the bottom. Light, minimal, Vercel-style. Collapsible to an icon-only rail
 * — the toggle persists via a cookie so the layout can render the right width
 * on the server (no flash). Admin and Partner shells pass their own nav + cookie.
 */
export function RoleSidebar({
  serverUser,
  defaultCollapsed = false,
  nav,
  label,
  brandHref,
  sectionLabel,
  collapseCookie,
  profileHref,
}: {
  serverUser: PlatformServerUser | null;
  defaultCollapsed?: boolean;
  nav: RoleNavItem[];
  /** Sublabel under the brand, e.g. "Admin Panel" / "Partner Portal". */
  label: string;
  /** Where the brand mark links (the portal home). */
  brandHref: string;
  /** Heading above the nav list, e.g. "Referral Program". */
  sectionLabel: string;
  /** Cookie name persisting the collapsed state for this portal. */
  collapseCookie: string;
  /** Account page for this portal, surfaced as "Profile" in the account menu. */
  profileHref?: string;
}) {
  const pathname = usePathname();
  const { displayName, displayEmail } = resolveHeaderDisplay(serverUser);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      document.cookie = `${collapseCookie}=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
      return next;
    });
  };

  return (
    <aside
      data-collapsed={collapsed || undefined}
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col bg-sidebar text-sidebar-foreground shadow-[0_0_20px_0_rgba(168,163,148,0.15)] transition-[width] duration-200 ease-linear",
        collapsed ? "w-16" : "w-[var(--sidebar-width)]",
      )}
    >
      {/* Brand + collapse toggle */}
      <div
        className={cn(
          "flex gap-2 pb-4 pt-5",
          collapsed ? "flex-col items-center px-2" : "flex-col px-5",
        )}
      >
        {collapsed ? (
          <>
            <BrandMark href={brandHref} glyphOnly />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label="Expand sidebar"
              className="size-8 text-muted-foreground hover:text-foreground"
            >
              <PanelLeftOpen className="size-4" />
            </Button>
          </>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <BrandMark href={brandHref} />
              <Button
                variant="ghost"
                size="icon"
                onClick={toggle}
                aria-label="Collapse sidebar"
                className="size-8 text-muted-foreground hover:text-foreground"
              >
                <PanelLeftClose className="size-4" />
              </Button>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 overflow-y-auto py-2", collapsed ? "px-2" : "px-3")}>
        {!collapsed && (
          <p className="px-2.5 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {sectionLabel}
          </p>
        )}
        <ul className="space-y-0.5">
          {nav.map((item) => {
            const onPrefix = (base: string) =>
              pathname === base || pathname.startsWith(`${base}/`);
            const active =
              (item.end ? pathname === item.href : onPrefix(item.href)) ||
              (item.match?.some(onPrefix) ?? false);
            const Icon = item.icon;
            const link = (
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center rounded-md text-sm font-medium transition-colors",
                  collapsed ? "justify-center p-2" : "gap-3 px-2.5 py-2",
                  // Active = warm-gray fill + brand-gold bold label (DESIGN navigation-menu-active),
                  // NOT a green fill — green is reserved for actions.
                  active
                    ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {collapsed ? <span className="sr-only">{item.label}</span> : item.label}
              </Link>
            );

            return (
              <li key={item.href}>
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                ) : (
                  link
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Account */}
      <div className={cn("border-t border-sidebar-border p-3", collapsed && "flex justify-center")}>
        <HeaderUserMenu
          displayName={displayName}
          displayEmail={displayEmail}
          avatarInitials={getInitials(displayName, displayEmail)}
          compact={collapsed}
          profileHref={profileHref}
          onSignOut={() => {
            void signOutAction();
          }}
        />
      </div>
    </aside>
  );
}
