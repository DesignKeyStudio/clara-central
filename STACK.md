---
appType: end-to-end
database: supabase
auth: supabase
storage: supabase
email: resend
framework: nextjs-16
ormProvider: postgresql
runtime: node-20+
---

# STACK

> Stack choices captured during initial project setup. Update this file when the database, auth provider, or major framework version changes.
>
> Companion docs: [CODEMAP.md](./CODEMAP.md) (where the code lives)

## App type

**end-to-end**

- **end-to-end** — production-bound application. Real database, real auth, migrations checked in.
- **prototype** — throwaway demo / spike. In-memory database, mocked auth, no migration files. Faster to iterate; not deployable.

## Database

**supabase**

| Choice | What it means | Config files affected |
|--------|---------------|----------------------|
| `supabase` | Hosted Supabase Postgres + pooler. Default. | `.env` (DATABASE_URL, DIRECT_URL), `prisma/schema.prisma` |
| `postgres-local` | Local Postgres instance (Docker or native). | `.env` (DATABASE_URL), `prisma/schema.prisma` (no `directUrl`) |
| `sqlite` | SQLite file at `prisma/dev.db`. | `.env` (DATABASE_URL=`file:./prisma/dev.db`), `prisma/schema.prisma` (`provider = "sqlite"`) |
| `in-memory` | SQLite in-memory (`file::memory:?cache=shared`). Prototype only. | `.env`, schema same as `sqlite` |

- **Multi-tenancy**: **app-level scoping** (not RLS). Every domain row carries an `organizationId`; a user is linked to orgs via `OrganizationMembership`; `getSessionContext()` resolves the active org and services scope every query to it. All legacy data lives in the fixed **Default** org (`org_default`); orgs are created in code only (`organization-service`). Added in migration `20260714120000_multi_org_foundation`. See [CODEMAP.md](./CODEMAP.md) → Multi-tenancy.
- **Demo environment**: public `/demo?role=admin|partner` mints an isolated `isDemo` org (seeded via `demo-service`), a throwaway Supabase auth user, and an SSR session — one sandbox per visitor (reused across visits via the `cb_demo` cookie). Idle demos are reaped by a daily **Vercel Cron** (`api/cron/cleanup-demo`, `CRON_SECRET`-gated) — the app's only scheduled job. Sandbox limits, both gated on `isDemoOrg()` (`organization-service`): notifications send nothing, and **self-service email change is disabled** (the login identity is a generated `demo-*@demo.claracentral.app` address `/demo` re-verifies on every visit, and `auth.users.email` is globally unique — a sandbox claiming a real address would break demo re-entry and collide with other tenants). See [CODEMAP.md](./CODEMAP.md) → Demo environment flow.
- **Row-Level Security**: RLS is enabled on every table and carries **partner-scoped + admin + marketing policies** (migration `20260701122000_rls_policies`). Partners read only their own rows (`auth.uid() = partners.user_id`), admins read across all (`app_metadata.role = 'admin'` via `public.claracentral_is_admin()`), marketing/app_config are authenticated-read/admin-write, and `anon` is fully denied. **Prisma connects as the table owner and bypasses RLS**, so the app is unaffected — policies are defense-in-depth for any PostgREST / supabase-js access. See [CODEMAP.md](./CODEMAP.md) → Database.

## Auth

**supabase**

- **supabase** — Supabase Auth via `@supabase/ssr` and `@supabase/supabase-js`. Real users, real sessions, real email flows.
- **mocked** — `PROTOTYPE_MODE=true` activates `src/lib/supabase/client-mock.ts` and `server-mock.ts`. Auto-logs-in a demo user. Login page short-circuits. Only valid for `appType: prototype`.
- **Identity verification (perf):** per-request auth (`getSessionContext`, `getPlatformServerUser`, `signOutAction`) verifies the access-token JWT **locally** via `getClaims()` (`src/lib/supabase/claims.ts`) instead of the network `getUser()` — no Auth-server round-trip on every server action / RSC prefetch. **Requires asymmetric JWT signing keys enabled** on the Supabase project (Settings → JWT Keys); without them `getClaims()` falls back to a network call (still correct, just not faster). Middleware deliberately keeps `getUser()` as the session-refresh + routing-revocation point. The provider (still Supabase) is unchanged.

## Storage

**supabase** — Supabase Storage for binary assets (beyond Postgres + Auth).

- **Marketing files** live in a private `marketing` bucket. Uploads / removes / signed URLs go through the service-role client in `src/lib/supabase/marketing-storage.ts`; the bucket name is shared via `src/lib/supabase/buckets.ts` (client-safe).
- **Upload** = signed-upload-URL flow: a server action mints `createSignedUploadUrl`, the browser uploads directly to Storage, a second action persists the `MarketingItem` row. Keeps large files (≤50 MB) out of the Next server — no `serverActions.bodySizeLimit` bump.
- **Download** = short-lived signed URLs with `Content-Disposition: attachment` (admins now; approved partners later).
- **Prototype mode**: the mock client has no `.storage`, so file features require real Supabase. The bucket itself (private, 50 MB limit, docs/slides/images/archives MIME allowlist) is provisioned out-of-band, not in app code.

## Email

**resend** — transactional email (partner invitations + approval notices) via the [Resend](https://resend.com) SDK.

- Integration lives in `src/lib/email/` (external I/O — kept out of the pure services), called from the action layer like Supabase Storage. Best-effort: a send failure never breaks the surrounding mutation.
- **Org-aware dispatch**: every `notify*` in `src/lib/notifications/` takes an `organizationId`. Admin alerts fan out only to that org's admins (scoped via `OrganizationMembership`), and any notification for a demo (`isDemo`) org is suppressed — the demo sandbox never sends real email/SMS.
- Config: `RESEND_API_KEY` + `EMAIL_FROM` (see `.env.example`). With no key set (or in prototype mode), sends are skipped and the app still works.
- **No verified sending domain yet**: the default `onboarding@resend.dev` sender only delivers to the Resend account owner's address. Production = verify a domain in Resend (SPF/DKIM/DMARC) + change `EMAIL_FROM` — no code change.
- **Partner OTP login**: `requestPartnerOtp`/`verifyPartnerOtp` in `src/app/actions/auth.ts` gate on an approved+linked+active partner, then establish the session. Delivery is flag-controlled by **`NEXT_PUBLIC_PARTNER_OTP_EMAIL`**:
  - **Unset / `"false"` (default)** — no email is sent; the code screen accepts **any 6 digits** and the session is minted server-side via a service-role `generateLink` (no email needed). This is the current mode (deployed variant has no sending domain yet). The partner gate still restricts login to approved partners.
  - **`"true"`** — real emailed OTP (TKT-001): `signInWithOtp({ shouldCreateUser: false })` / `verifyOtp({ type: "email" })` + a `partner`-role re-assert. Requires the Supabase project configured in the dashboard: Auth → Email Templates → "Magic Link" must include `{{ .Token }}` (carries the 6-digit code), and Auth → Providers → Email needs a working sender (built-in SMTP for low volume, or custom SMTP / Resend). Independent of the `src/lib/email/` Resend integration (app-level invite/approval emails).
  - In `PROTOTYPE_MODE` the Supabase client is mocked (any 6 digits; returns the demo admin user).

## Framework versions (at time of setup)

- **Next.js**: 16.x (App Router, Turbopack)
- **React**: 19.x
- **TypeScript**: 5.x
- **Tailwind CSS**: v4 (CSS-first config)
- **shadcn**: 3.x (latest registry)
- **Prisma**: 6.x
- **Node.js**: ≥20 required

When upgrading a major version, update this section and the corresponding entry in `package.json`.

## Configuration

- **Environment variables**: see `.env.example` for the full list. Required keys differ by `database` and `auth` choice.
- **ORM**: Prisma (regardless of database choice). Schema lives in `prisma/schema.prisma`.
- **Migrations**: only for `supabase`, `postgres-local`, and `sqlite`. For `in-memory`, schema is push'd via `prisma db push` at boot.

## Changing the stack later

- **DB swap**: edit `prisma/schema.prisma` provider, update `.env`, run `pnpm exec prisma generate` and migrate/push. Update the YAML front matter above.
- **Auth swap**: more involved — see `src/lib/supabase/` for the auth surface. Document the swap in this file and `CODEMAP.md`.
- **Major framework version**: follow upstream migration guide, update `package.json`, update YAML above.
