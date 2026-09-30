/**
 * Integration-test setup (runs before every test file in the `integration`
 * project). Loads the DB connection env the same way the Prisma CLI does, so the
 * app's `prisma` client (src/lib/prisma) connects to a real database.
 *
 * Integration tests need a reachable Postgres (`DATABASE_URL`). Run them with:
 *   pnpm test            # vitest run --project integration
 * They are skipped-by-guard when no DATABASE_URL is present (see the test file).
 */
import { config } from "dotenv";
import { resolve } from "node:path";

// .env holds DATABASE_URL/DIRECT_URL; .env.local may override. Load both, .local last.
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });
