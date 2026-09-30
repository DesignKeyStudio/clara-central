"use client";

import type { ReactNode } from "react";
import { RoleSidebar } from "@/components/layout/role-sidebar";
import { ADMIN_NAV } from "@/lib/admin-nav";
import type { PlatformServerUser } from "@/types";

/**
 * Admin portal chrome: fixed left sidebar + scrollable content column.
 * Wraps every `/admin/*` page (see `src/app/admin/(panel)/layout.tsx`).
 */
export function AdminShell({
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
        nav={ADMIN_NAV}
        label="Admin Panel"
        brandHref="/admin"
        sectionLabel="Referral Program"
        collapseCookie="admin_sidebar_collapsed"
        profileHref="/admin/profile"
      />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-7xl px-6 py-8 md:px-8">{children}</div>
      </main>
    </div>
  );
}
