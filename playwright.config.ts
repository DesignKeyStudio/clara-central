import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration for Clara Central.
 *
 * Target: the REAL app (real Supabase auth + Postgres), NOT prototype mode —
 * the webServer below forces `NEXT_PUBLIC_PROTOTYPE_MODE=false` so the login
 * screens and the partner portal are reachable (prototype mode bypasses both).
 *
 * Prerequisites (see e2e/README.md):
 *   1. `.env.local` points at a real/test Supabase project + Postgres.
 *   2. `pnpm exec prisma db seed` has been run — creates the admin + partner
 *      accounts the suite logs in as (admin@example.com, jordan@diazgroup.com).
 *
 * Server handling: Next.js allows only one `next dev` per project (a lock in
 * .next/dev), so we target the standard dev port and REUSE a server that's
 * already up rather than starting a second one. If nothing is running, Playwright
 * starts `next dev` itself (forcing real auth mode). If you keep a `pnpm dev`
 * running, make sure it's in real mode — a reused prototype-mode server bypasses
 * the login screens and the partner portal, which these tests rely on.
 */

const PORT = Number(process.env.E2E_PORT ?? 3000);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

// Walkthrough recording is OFF by default — set WALKTHROUGH=1 to arm the
// `walkthrough-*` projects below (see the qa-run skill's optional §5b step).
const WALKTHROUGH = !!process.env.WALKTHROUGH;

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  // Run tests in files in parallel.
  fullyParallel: true,
  // Fail the build on CI if you accidentally left `test.only` in the source.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL,
    trace: "on",
    screenshot: "only-on-failure",
  },

  projects: [
    // 1) Sign in once per role and persist the session (see e2e/auth.setup.ts).
    { name: "setup", testMatch: /auth\.setup\.ts$/ },

    // 2) Auth + landing flows — NO stored session (they exercise login itself).
    {
      name: "auth-flows",
      testMatch: "auth/**/*.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },

    // 3) Admin portal — read-only specs, reuse the saved admin session.
    {
      name: "admin",
      testMatch: "admin/**/*.spec.ts",
      testIgnore: "**/*.mut.spec.ts",
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/admin.json" },
      dependencies: ["setup"],
    },

    // 4) Partner portal — read-only specs, reuse the saved partner session.
    {
      name: "partner",
      testMatch: "partner/**/*.spec.ts",
      testIgnore: "**/*.mut.spec.ts",
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/partner.json" },
      dependencies: ["setup"],
    },

    // 5) Admin MUTATING specs (*.mut.spec.ts) — they write to the DB and reseed
    //    in afterEach. Depend on every read-only project so those assert against
    //    pristine seed data BEFORE any mutation runs.
    {
      name: "admin-mutations",
      testMatch: "admin/**/*.mut.spec.ts",
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/admin.json" },
      dependencies: ["setup", "admin", "partner", "auth-flows"],
    },

    // 6) Partner MUTATING specs — run LAST (after admin-mutations), so the two
    //    write phases never overlap on the shared DB.
    {
      name: "partner-mutations",
      testMatch: "partner/**/*.mut.spec.ts",
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/partner.json" },
      dependencies: ["setup", "admin-mutations"],
    },

    // 7) Walkthrough recording — OFF by default; armed with WALKTHROUGH=1 by the
    //    qa-run skill's optional "record walkthrough" step (§5b). Re-runs an
    //    already-graduated spec with video + trace + slow pacing to produce a
    //    human-watchable clip for QA. Scope to one flow with a file arg, e.g.:
    //      WALKTHROUGH=1 pnpm exec playwright test --project=walkthrough-admin e2e/admin/<flow>.spec.ts
    //    Output (video.webm + trace.zip) lands in ./qa/.media (gitignored).
    ...(WALKTHROUGH
      ? [
          {
            name: "walkthrough-admin",
            // Also matches *.walk.ts — throwaway, no-reseed walkthrough specs that
            // the normal suite (testMatch *.spec.ts) never picks up.
            testMatch: ["admin/**/*.spec.ts", "admin/**/*.walk.ts"],
            use: {
              ...devices["Desktop Chrome"],
              // Larger viewport + matching video size — Playwright otherwise
              // scales the clip down to fit 800x800, which reads tiny.
              viewport: { width: 1600, height: 900 },
              storageState: "e2e/.auth/admin.json",
              video: { mode: "on" as const, size: { width: 1600, height: 900 } },
              trace: "on" as const,
              launchOptions: { slowMo: 300 },
            },
            outputDir: "./qa/.media",
            dependencies: ["setup"],
          },
          {
            name: "walkthrough-partner",
            testMatch: ["partner/**/*.spec.ts", "partner/**/*.walk.ts"],
            use: {
              ...devices["Desktop Chrome"],
              viewport: { width: 1600, height: 900 },
              storageState: "e2e/.auth/partner.json",
              video: { mode: "on" as const, size: { width: 1600, height: 900 } },
              trace: "on" as const,
              launchOptions: { slowMo: 300 },
            },
            outputDir: "./qa/.media",
            dependencies: ["setup"],
          },
        ]
      : []),
  ],

  // Boot the Next.js app for the duration of the run.
  webServer: {
    command: `pnpm exec next dev --turbopack --port ${PORT}`,
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    // Force real auth mode regardless of what `.env.local` sets.
    env: { NEXT_PUBLIC_PROTOTYPE_MODE: "false" },
  },
});
