# End-to-end tests (Playwright)

Browser-driven tests that exercise Clara Central the way a real user does: open a
page, click, type, assert what's on screen. They run against the **real** app —
real Supabase auth and Postgres — not prototype mode.

> Not to be confused with the **Vitest** suites (`pnpm test`, in `tests/`) which
> test units/integration in Node, and the **Storybook** browser tests. Those use
> Playwright as a library; this folder uses the Playwright _test runner_
> (`@playwright/test`).

## Prerequisites

1. **`.env.local`** points at a real or test Supabase project + Postgres
   (same vars as `pnpm dev` in real mode — see `.env.example`).
2. **Seed the database** so the login accounts exist:
   ```bash
   pnpm exec prisma db seed
   ```
   This creates the two accounts the suite signs in as:
   | Role    | Email                  | How it signs in            |
   |---------|------------------------|----------------------------|
   | Admin   | `admin@example.com`    | password `AdminPass123!`   |
   | Partner | `jordan@diazgroup.com` | OTP — any 6-digit code     |

   > ⚠️ The suite writes/reads real seed data. Point it at a **test/staging**
   > project, not production.

## Running

```bash
pnpm test:e2e            # headless, all projects
pnpm test:e2e:ui         # interactive UI mode — best for writing/debugging tests
pnpm test:e2e:headed     # watch it drive a real browser window
pnpm test:e2e:report     # open the HTML report from the last run
```

If nothing is serving on **port 3000**, Playwright starts the app itself
(`next dev`, forcing `NEXT_PUBLIC_PROTOTYPE_MODE=false`) — so you don't need a
server running. If a `pnpm dev` is already on 3000 it's **reused**, so make sure
that one is in real mode (a prototype-mode server bypasses the login screens and
the partner portal). Target a deployed environment instead with
`E2E_BASE_URL=https://staging.example.com pnpm test:e2e`.

Run a subset:
```bash
pnpm test:e2e --project=auth-flows        # just the login/landing tests
pnpm test:e2e --project=admin             # admin read-only specs
pnpm test:e2e --project=admin-mutations   # admin write flows (reseeds after each)
pnpm test:e2e e2e/partner/referrals.spec.ts
```

> ⚠️ **Shared database.** The whole suite runs against ONE Supabase/Postgres.
> Don't run it (especially the `*-mutations` projects) while someone else is
> testing the same DB — the mutating specs reseed it and will clobber their
> data. Point at a separate project with `.env.local` if you need isolation.

## Layout

```
e2e/
  constants.ts          Test accounts + seed figures the specs assert against
  helpers.ts            kpi() / openRow() locator helpers
  reseed.ts             Restores the DB to seeded state (used by mutating specs)
  auth.setup.ts         Logs in once per role, saves the session to .auth/
  .auth/                Saved sessions (gitignored — they're real credentials)
  auth/                 Login & landing flows (run logged-OUT)
  admin/                Admin portal (run as admin via saved session)
  partner/              Partner portal (run as partner via saved session)
  **/*.mut.spec.ts      MUTATING specs — write to the DB, reseed after each test
```

### Read-only vs. mutating specs (and reseeding)

Specs come in two flavours:

- **Read-only** (`*.spec.ts`) — only navigate and assert; never write. Safe to
  run anytime, in any order. They make up the `admin` / `partner` projects.
- **Mutating** (`*.mut.spec.ts`) — create/edit data (approve a partner, record a
  payout, add an invoice, refer a contact…). They make up the `admin-mutations`
  / `partner-mutations` projects, which:
  1. **Depend on** the read-only projects, so those assert against pristine seed
     data *before* any write happens.
  2. Run **serially** and **reseed the DB after every test** (`test.afterEach`
     → `reseed.ts`), so each case starts from a clean baseline and order never
     matters. The seed re-links the admin/partner auth users by fixed id, so the
     saved sessions survive a reseed — no re-login.

If a run is interrupted mid-mutation (process killed), the DB is left dirty —
just re-run the suite (the next `afterEach` reseeds) or run
`pnpm exec prisma db seed` by hand.

Name any new write-flow spec `*.mut.spec.ts` so it lands in a mutations project;
otherwise it'll run as read-only and won't reseed.

### How auth works (the `storageState` pattern)

Logging in through the UI in every test is slow. Instead, the `setup` project
(`auth.setup.ts`) signs in **once** per role and saves the browser session to
`e2e/.auth/<role>.json`. The `admin` and `partner` projects declare `setup` as a
dependency and load that file via `storageState`, so each test starts already
authenticated. The `auth-flows` project deliberately has no `storageState` — it
tests the login screens themselves.

## Adding a test

1. Decide who's acting: admin → `admin/`, partner → `partner/`, logged-out →
   `auth/`. The folder picks the right session automatically.
2. Prefer role/label/text selectors (`getByRole`, `getByLabel`, `getByText`)
   over CSS classes — they're stable across restyles and assert accessibility.
3. Assert on visible outcomes (a heading, a row, a URL), not implementation.
4. Tip: `pnpm test:e2e:ui` + the "Pick locator" tool is the fastest way to find
   a good selector — the same MCP-driven exploration you'd do by hand, but it
   hands you the locator to paste in.
