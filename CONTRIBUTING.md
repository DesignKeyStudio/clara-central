# Contributing to Clara Central

Thanks for taking the time. This document covers how to get the project running,
the conventions a pull request is expected to follow, and the few things we
routinely turn down.

By participating you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md).
Security problems go to [SECURITY.md](./SECURITY.md) — never a public issue.

---

## Before you write code

- **Bugs** — open an issue with reproduction steps first, unless the fix is a
  one-liner. Use the [bug report template](./.github/ISSUE_TEMPLATE/bug_report.md).
- **Features** — open a [feature request](./.github/ISSUE_TEMPLATE/feature_request.md)
  and wait for a maintainer to agree on the shape before building. Clara Central
  has an opinionated scope; an unsolicited feature PR is likely to be declined on
  product grounds even when the code is good, and we would rather not waste your
  weekend.
- **Docs, typos, small refactors** — go straight to a PR.

## Local setup

Follow the [quick start in the README](./README.md#quick-start). You need Node 20+,
pnpm, and a free Supabase project; `./setup.sh` installs dependencies, scaffolds the
two env files, and generates the Prisma client.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server (Turbopack) on port 3003 |
| `pnpm build` | Production build — `prisma generate` + `next build` |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit`; broader than the build (also covers `tests/`, `e2e/`, `scripts/`, stories) |
| `pnpm test:unit` | Pure-logic unit tests, no database. **This is what CI gates on.** |
| `pnpm test` | Integration tests — needs a database, does not gate PRs |
| `pnpm test:e2e` | Playwright end-to-end suite |
| `pnpm storybook` | Storybook on port 6006 |

Before opening a PR, `pnpm build`, `pnpm lint`, `pnpm typecheck`, and
`pnpm test:unit` should all pass.

### A note on adding dependencies

`pnpm-workspace.yaml` sets `minimumReleaseAge: 4320` — pnpm refuses to install any
version published in the last three days, as supply-chain hardening. If you add a
brand-new release, `pnpm install` will fail until the cooldown elapses. That is
working as intended; wait it out rather than lowering the floor.

pnpm also blocks install and build scripts by default. A dependency that
legitimately needs one (native binary, codegen) must be added to
`onlyBuiltDependencies` in the same PR, with a comment saying why.

New dependencies need justification in the PR description. We prefer a small
amount of our own code to a transitive tree.

## Commit conventions

Every commit message starts with a lowercase type prefix. Use the most specific
one that applies.

| Prefix | When to use |
|--------|-------------|
| `feat:` | New feature or functionality |
| `fix:` | Bug fix |
| `hotfix:` | Urgent production fix |
| `refactor:` | Code restructuring without behavior change |
| `cleanup:` | Remove dead code, unused imports, formatting |
| `docs:` | Documentation (README, CODEMAP, etc.) |
| `spec:` | Spec or design document changes |
| `tests:` | Adding or updating tests |
| `task:` | Task/project management files |
| `ticket:` | Ticket-related changes |
| `CR:` | Code review feedback changes |
| `chore:` | Config, dependencies, CI, tooling |

Format: `prefix: short description` — imperative mood, under 72 characters.

## Keep the companion docs in sync

This repository keeps a set of maps that other contributors (and coding agents)
rely on to navigate it. Updating them is part of the change, not a follow-up:

| You changed... | Update |
|---|---|
| A service, action, hook, query, route, or top-level folder | [CODEMAP.md](./CODEMAP.md) |
| A component, or added a variant | [COMPONENT.md](./COMPONENT.md) |
| A UI pattern, design token, or styling rule | [DESIGN.md](./DESIGN.md) |
| The database, auth provider, or a major framework version | [STACK.md](./STACK.md) |

**Do not edit [PRODUCT.md](./PRODUCT.md).** It records user-facing product
decisions and is maintained by the maintainers only.

## Pull requests

- Branch from `main`; keep one logical change per PR.
- Fill in the [PR template](./.github/PULL_REQUEST_TEMPLATE.md).
- Include a screenshot or short clip for any visible UI change.
- Add tests for logic that can be tested without a database — that is the suite
  CI runs.
- Rebase rather than merge `main` into your branch.

## Versioning

The project follows [SemVer](https://semver.org). Until `1.0.0`, breaking changes
may land in a minor release; they will be called out in
[CHANGELOG.md](./CHANGELOG.md) under **Changed** either way. Do not bump the
version in `package.json` in a PR — releases are cut by the maintainers.

## What we usually decline

- Version bumps with no stated reason (Dependabot handles routine updates)
- Sweeping reformatting or lint-rule changes mixed into a feature PR
- New dependencies that duplicate something already in the tree
- Features that expand product scope without a prior discussion
- Edits to `PRODUCT.md`

## Licensing of contributions

Clara Central is dual-licensed. The public code is under the
[PolyForm Noncommercial License 1.0.0](./LICENSE.md), and Design Key LLC sells
commercial licenses for everything else — see [LICENSING.md](./LICENSING.md).

To offer your contribution under both licenses, we need your permission to do
so. Before your first pull request can be merged, you will be asked to sign a
**Contributor License Agreement (CLA)** that lets Design Key LLC distribute your
contribution under the noncommercial license and under its commercial licenses.
A Developer Certificate of Origin (`Signed-off-by`) line on its own is not
enough, because it does not grant that permission.

The agreement is being finalized. Until it is published here, we cannot merge
pull requests from outside contributors, so please open an issue first and we
will let you know when the CLA is ready.

---

Originally built by [DesignKey Studio](https://www.designkey.studio).
