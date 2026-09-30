/**
 * Multi-tenancy constants.
 *
 * Keep this module free of `@/` path-alias imports — the Prisma seed imports it
 * via a relative path under `tsx`, which does not resolve tsconfig aliases.
 */

/**
 * Fixed id of the "Default" organization. Every row that existed before
 * multi-tenancy was backfilled into this org (see the backfill migration), and
 * public self-signup (`/apply`) — which has no org signal — lands here. It is a
 * real, non-demo tenant, so the demo-cleanup job (future) never touches it.
 */
export const ORG_DEFAULT_ID = "org_default";

/** Display name of the Default organization. */
export const ORG_DEFAULT_NAME = "Clara Central";
