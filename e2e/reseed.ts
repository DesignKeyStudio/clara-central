import { execSync } from "node:child_process";

/**
 * Restore the database to its known seeded state.
 *
 * The mutating specs (`*.mut.spec.ts`) call this in `test.afterAll`, so the
 * suite is idempotent: the writes from one run never skew the next run's
 * read-only assertions. This automates the TEST-PLAN's "🔁 reseed afterward"
 * discipline.
 *
 * Runs the same command as `pnpm exec prisma db seed` (see package.json's
 * `prisma.seed`). The seed re-links the admin + partner auth users by FIXED id,
 * so the saved storageState sessions in e2e/.auth stay valid across a reseed —
 * no re-login needed.
 *
 * NOTE: if a run is interrupted mid-mutation (process killed), the DB is left
 * dirty — re-run the suite (the next afterAll reseeds) or run the command above
 * by hand to restore a clean baseline.
 */
export function reseed(): void {
  execSync("pnpm exec prisma db seed", { stdio: "inherit", timeout: 110_000 });
}
