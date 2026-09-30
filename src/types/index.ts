// ============================================================
// Clara Central — App-level shared types
//
// Domain entity types come straight from Prisma (`@prisma/client`);
// this file holds only shapes that aren't 1:1 with a table.
// ============================================================

import type { user_role } from "@prisma/client";

/** Supabase session snapshot for the portal shell header. */
export type PlatformServerUser = {
  email: string;
  name: string | null;
  role: user_role | null;
};

/**
 * Server-side auth context resolved per request from the Supabase session.
 * `role` comes from the user's (non-editable) app_metadata. `organizationId` is
 * the active tenant, resolved from the user's OrganizationMembership (DB-
 * authoritative, not from the JWT). Every service scopes its queries to it.
 */
export type SessionContext = {
  userId: string;
  role: user_role;
  /** Active organization — every read/write is scoped to it. */
  organizationId: string;
  /** Set only when role === "partner". */
  partnerId?: string;
};
