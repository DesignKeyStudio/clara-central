# CLAUDE.md

## Clara Central

A referral management system where past clients refer new business and earn a rate-based share of the payments their referrals generate.

## Companion docs — load when relevant

| File | Read when working on... |
|------|------------------------|
| [PRODUCT.md](./PRODUCT.md) | Features, scope, user-facing decisions, domain terms |
| [DESIGN.md](./DESIGN.md) | UI, styling, design tokens, layout, accessibility (Google Stitch format) |
| [COMPONENT.md](./COMPONENT.md) | Picking, adding, or modifying UI components |
| [CODEMAP.md](./CODEMAP.md) | Navigating the codebase or adding new files/services |
| [STACK.md](./STACK.md) | Understanding the database/auth/framework choices |

## Tech stack

Next.js 16 | React 19 | TS 5 | Tailwind v4 | shadcn/ui + ReUI | Zustand 5 | TanStack Query/Table | Prisma 6 | Supabase Auth | PostgreSQL

## Commands

- `pnpm dev` — Dev server with Turbopack
- `pnpm build` — Production build (`prisma generate` + `next build`; Storybook is built separately via `pnpm build-storybook`)
- `pnpm lint` — ESLint
- `pnpm typecheck` — `tsc --noEmit` (broader than the build: also covers `tests/`, `e2e/`, `scripts/`, stories)
- `pnpm test:unit` — pure-logic unit tests only, no database (this is what CI runs)
- `pnpm storybook` — Storybook dev on port 6006
- `pnpm build-storybook` — Build Storybook to `public/storybook/`
- `pnpm exec prisma generate` — Regenerate Prisma client
- `pnpm exec prisma migrate dev --name <description>` — Create migration
- `pnpm exec prisma db seed` — Seed demo org + admin user

This project uses **pnpm** (see `packageManager` in `package.json`). Config lives in `pnpm-workspace.yaml`:
- `minimumReleaseAge` enforces a multi-day cooldown before any newly published version is installed — a supply-chain guardrail. New deps published within that window won't resolve until the cooldown passes (add trusted exceptions to `minimumReleaseAgeExclude`).
- pnpm blocks postinstall/build scripts by default. When you add a dependency that needs one (native binary, codegen), `pnpm install` warns and ignores it until you add the package to `onlyBuiltDependencies`.

Environment variables live in **`.env.local`** (app runtime) and **`prisma/.env`** (Prisma CLI —
needs `DATABASE_URL` + `DIRECT_URL`). Both are gitignored; `./setup.sh` scaffolds them. See
`.env.example` for the full list.

## Commit conventions

Every commit message starts with a type prefix. Use the most specific one that applies:

| Prefix | When to use |
|--------|-------------|
| `feat:` | New feature or functionality |
| `fix:` | Bug fix |
| `hotfix:` | Urgent production fix |
| `refactor:` | Code restructuring without behavior change |
| `cleanup:` | Remove dead code, unused imports, formatting |
| `docs:` | Documentation (README, CLAUDE.md, CODEMAP.md, etc.) |
| `spec:` | Spec or design document changes |
| `tests:` | Adding or updating tests |
| `task:` | Task/project management file changes |
| `ticket:` | Ticket-related changes |
| `CR:` | Code review feedback changes |
| `chore:` | Config, dependencies, CI, tooling |

Format: `prefix: short description` (lowercase prefix, imperative mood, under 72 chars).

## Update discipline — read before completing any code change

When you add, rename, or remove code, you **must** update the companion docs in the same commit:

- **Added/renamed/removed** a service, action, hook, query, component category, route, or top-level folder → update `CODEMAP.md`
- **Added/renamed/removed a component, or added a new variant** → update `COMPONENT.md`
- **Added** a UI pattern, design token, or styling rule that other code should follow → update `DESIGN.md` (keep YAML front matter and prose body in sync)
- **Changed** the database, auth provider, or major framework version → update `STACK.md`

**PRODUCT.md is user-initiated only.** Do **not** edit `PRODUCT.md` unless the user explicitly asks. Products evolve and the file is intentionally lean — automated rewrites cause drift.

Treat doc updates as part of the change, not an afterthought. The cost of skipping is real: future Claude sessions waste tokens re-discovering structure that the maps should have captured.

### Claude Code skills

Project-level skills live in `.claude/skills/`. They auto-invoke based on their `description` frontmatter.

- `.claude/skills/update-codemap/SKILL.md` — keeps `CODEMAP.md` in sync with the file tree. Triggers on file additions, renames, removals, or when the user asks to "update / refresh / sync CODEMAP".
- `.claude/skills/update-component/SKILL.md` — keeps `COMPONENT.md` in sync with `src/components/`. Triggers on component additions, renames, removals, variant changes, or when the user asks to "update / refresh / sync COMPONENT" or "catalog components".
- `.claude/skills/qa-run/SKILL.md` — orchestrates a per-feature QA run: scopes the git diff, plans English test cases at a chosen depth tier, writes a runbook under `qa/runs/`, delegates live browser execution to the `playwright-driver` subagent, records results, triages/fixes, and gates graduation to committed e2e specs. Consults `qa/REFERENCE.md` for project invariants (scaffolds it on first run if absent). Triggers on "do a qa run", "run qa", or "qa this feature".
- `.claude/skills/record-changelog/SKILL.md` — turns shipped work into a curated, user-facing `CHANGELOG.md` entry (release notes) you can share with users or lift into public docs. A helper script (`scripts/gather-changes.mjs`) gathers git commits in a range + the session's intent; the skill curates them into Keep-a-Changelog categories, dropping internal churn. Triggers on "record / update the changelog", "generate / draft release notes", "what shipped", or "changelog this".

Add new skills by creating `.claude/skills/<skill-name>/SKILL.md` with YAML frontmatter (`name`, `description`) plus a markdown body of instructions.

### Claude Code subagents

Project-level subagents live in `.claude/agents/`. Delegate to them so their heavy output stays out of the main session's context.

- `.claude/agents/playwright-driver.md` — drives the running app in a browser (Playwright MCP) and asserts against the DB (Supabase MCP) to verify a fix/feature end-to-end, then returns a concise pass/fail report (no raw snapshots). Knows the QA env: dev server on `:3003`, admin/partner logins, the OTP mock, the CDP timezone-override recipe, and DB-assert-plus-cleanup. Use it for live verification instead of driving Playwright inline. Also runs in **batch mode** for the `qa-run` skill — executes a set of runbook cases and returns results keyed by case ID.

## Verification

Before marking work done:

1. `pnpm build` passes with zero errors
2. Affected code path works in dev (`pnpm dev`)
3. Companion docs reflect the change (per the discipline rule above)

