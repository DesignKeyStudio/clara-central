"use client";

import type { ReactNode } from "react";
import { RoleSidebar } from "@/components/layout/role-sidebar";
import { PARTNER_NAV } from "@/lib/partner-nav";
import type { PlatformServerUser } from "@/types";

/**
 * Partner portal chrome: fixed left sidebar + scrollable content column.
 * Wraps every `/partner/*` page (see `src/app/partner/(panel)/layout.tsx`).
 * Mirrors `AdminShell` — both compose the shared `RoleSidebar`.
 */
export function PartnerShell({
  serverUser,
  defaultCollapsed = false,
  children,
}: {
  serverUser: PlatformServerUser | null;
  defaultCollapsed?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <RoleSidebar
        serverUser={serverUser}
        defaultCollapsed={defaultCollapsed}
        nav={PARTNER_NAV}
        label="Partner Portal"
        brandHref="/partner"
        sectionLabel="Referral Program"
        collapseCookie="partner_sidebar_collapsed"
        profileHref="/partner/profile"
      />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-7xl px-6 py-8 md:px-8">{children}</div>
      </main>
    </div>
  );
}
