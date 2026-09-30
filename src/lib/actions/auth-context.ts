"use server";

import { createClient } from "@/lib/supabase/server";
import { getClaimsUser } from "@/lib/supabase/claims";
import { prisma } from "@/lib/prisma";
import type { SessionContext } from "@/types";

/**
 * Resolve the current request's auth context from the Supabase session.
 *
 * `role` is read from the user's `app_metadata` (set at provisioning time, NOT
 * user-editable — safe for authorization). `organizationId` is the active tenant,
 * resolved from the user's OrganizationMembership (DB-authoritative). Iteration 1
 * provisions exactly one membership per user, so we take the sole one; a user
 * with no membership is treated as unauthorized. For partners, the linked Partner
 * id is loaded (scoped to that org) and the partner must be approved.
 *
 * Throws when there is no authenticated user, no membership, or no valid
 * role/partner — callers (server actions) treat that as unauthorized.
 */
export async function getSessionContext(): Promise<SessionContext> {
  const supabase = await createClient();
  const claimsUser = await getClaimsUser(supabase);

  if (!claimsUser) {
    throw new Error("Not authenticated");
  }

  const { id: userId, role } = claimsUser;
  if (role !== "admin" && role !== "partner") {
    throw new Error("User has no assigned role");
  }

  // Active org = the user's (single) membership. When multi-org lands, this is
  // where an active-org selection (cookie/claim) will be resolved instead.
  const membership = await prisma.organizationMembership.findFirst({
    where: { userId },
    select: { organizationId: true },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) {
    throw new Error("User has no organization membership");
  }
  const organizationId = membership.organizationId;

  if (role === "partner") {
    const partner = await prisma.partner.findFirst({
      where: { organizationId, userId },
      // `user.isActive` gates a deactivated partner mid-session: a valid JWT keeps
      // routing-level access, but every server action funnels through here, so
      // flipping is_active=false revokes data access on the next request.
      select: { id: true, status: true, user: { select: { isActive: true } } },
    });
    if (!partner || partner.status !== "approved" || partner.user?.isActive === false) {
      throw new Error("Partner account is not active");
    }
    return { userId, role, organizationId, partnerId: partner.id };
  }

  return { userId, role, organizationId };
}
