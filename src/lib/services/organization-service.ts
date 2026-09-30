import type { Organization } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// ── Tenancy service ──
// Organizations are created via code only (no UI in iteration 1). This is the
// single entry point so every new tenant is born with its own AppConfig row —
// per-org commission settings, never shared. The future /demo feature calls
// createOrganization({ isDemo: true }) then provisions users + seed data on top.

export type CreateOrganizationInput = {
  name: string;
  /** Mark demo tenants so the (future) cleanup job can reap only these. */
  isDemo?: boolean;
  /** Override the generated TypeID — used by the seed to mint the fixed Default org. */
  id?: string;
};

/**
 * Create an organization and its default {@link AppConfig} row in one transaction.
 * The AppConfig uses the schema defaults (10% standard rate, 12-month window);
 * callers adjust via `updateAppConfig(org.id, …)`.
 */
export async function createOrganization(
  input: CreateOrganizationInput,
): Promise<Organization> {
  return prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        ...(input.id ? { id: input.id } : {}),
        name: input.name,
        isDemo: input.isDemo ?? false,
      },
    });
    await tx.appConfig.create({ data: { organizationId: org.id } });
    return org;
  });
}

/**
 * Whether an org is a demo sandbox. Demo tenants must never reach into the real
 * world: notifications send nothing (see src/lib/notifications), and self-service
 * email change is disabled (the login identity is a throwaway `demo-*` address the
 * /demo flow re-signs-in with, and `auth.users.email` is globally unique — letting
 * sandboxes claim real addresses would collide across demos).
 *
 * Best-effort: on a lookup failure we treat it as NOT a demo (fail open to normal
 * behavior) — but callers already pass a real org id, so this only trips on a DB
 * hiccup.
 */
export async function isDemoOrg(organizationId: string): Promise<boolean> {
  const org = await prisma.organization
    .findUnique({ where: { id: organizationId }, select: { isDemo: true } })
    .catch(() => null);
  return org?.isDemo ?? false;
}
