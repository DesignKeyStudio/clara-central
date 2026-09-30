---
name: qa-run
description: Use this skill when the user wants to QA-test a feature end-to-end before it ships — when they have just finished a feature branch, fixed a batch of bugs, or ask to validate a flow in the real running app. Trigger on phrases like "do a qa run", "run qa", "qa this feature", "qa this branch", "run a qa pass", or "let's qa <feature>". Scopes the change (diff, named files, or recent commits), plans or imports English test cases at a chosen depth tier, generates a per-run runbook at qa/runs/YYYY-MM-DD-<slug>.md, delegates live browser execution to the playwright-driver subagent, records results back into the runbook, triages findings, and optionally graduates critical flows into committed Playwright e2e specs. Consults qa/REFERENCE.md for project-specific invariants (and offers to scaffold it on first run if absent). Does NOT replace the playwright-driver subagent (one-off "verify this fix") or the update-codemap / update-component doc skills.
---

# QA run

You are the **orchestrator** of a per-feature QA run: scope the change, plan or import test cases,
delegate live execution to the `playwright-driver` subagent, record results, triage and fix, and gate
graduation to committed e2e specs.

This skill is the portable **engine** — it works across projects. Every project-specific fact (how to
run the app, logins, domain invariants, where the spec lives) comes from **`qa/REFERENCE.md`**, not
from this file. Examples below are illustrative; treat `qa/REFERENCE.md` as the source of project
truth. **You own the runbook file — the `playwright-driver` subagent never writes files.** Drive the phases in
order; stop on a blocker (see *When to bail*).

## When to invoke

- The user says "do a qa run", "run qa", "qa this feature/branch", "let's qa <x>", or has just
  finished a feature / bug-fix batch and wants it validated in the real app before shipping.
- **Not for a single known fix.** "Does this one change work?" → delegate straight to the `playwright-driver`
  subagent (no runbook, no planning). Use `qa-run` when the scope is *a feature* and you want planning
  + a tracked runbook + a graduation decision.

## Procedure

### 0. Load or scaffold the QA reference

- Check for **`qa/REFERENCE.md`**. If present, read it — its invariants-by-area, domain invariants,
  UI conventions, watch-for classes, and spec source steer Plan (§2), Execute (§3), and Triage (§4).
- **If absent** (e.g. a repo this skill was just copied into), offer to scaffold it. Ask the developer
  for: (a) how to run the app + the URL, (b) logins / roles, (c) where the spec/requirements live, if
  anywhere, (d) the key domain invariants and risk areas. Write a starter `qa/REFERENCE.md` using its
  section structure (What this is · Spec source · Environment & fixtures · Invariants-by-area · Domain
  invariants · UI conventions · Watch-for · See also), then continue. If the developer declines,
  degrade gracefully — ask only what this run needs and persist nothing.

### 1. Intake — pick the scope source, then scope it

Ask the developer where the scope comes from — AskUserQuestion *"What should I scope this QA run to?"*,
recommending the option that matches the current git state (`git branch --show-current`,
`git status --porcelain`):

- **Uncommitted changes** — `git diff HEAD` + untracked files (work in progress).
- **This branch vs `main`** — `git diff "$(git merge-base HEAD origin/main 2>/dev/null || git merge-base HEAD main)"...HEAD` (a finished feature branch).
- **Specific files or a feature area** — when the feature is already committed, or the tree mixes
  several features. Scope to just those paths, so the developer needn't commit unrelated work first.
- **Recent commit(s)** — e.g. `HEAD~n..HEAD` or a merge range (a feature that landed without a QA run).

Read the chosen diff/files, classify into buckets (routes, server actions, services, schema, forms,
components), and cross-reference `qa/REFERENCE.md` §"Invariants by area" for the checks each bucket
demands. Read the project domain doc (e.g. `PRODUCT.md`) for terms. Ask only to fill genuine gaps the
scope can't answer (which role(s) to test as; reachable via nav or only by direct URL).

### 2. Plan — pick the case source, then write the runbook

Ask where the cases come from — AskUserQuestion *"Where should the test cases come from?"*:

- **Generate from the scope** — derive cases from the diff/files + `qa/REFERENCE.md` invariants.
- **Import existing** — the dev or PM already wrote cases (sometimes the PM authors them); take a file
  path or pasted text and normalize them into the runbook as-is.
- **Import + augment** — use the provided cases AND add coverage for the gaps (negatives,
  access-control, commission-math per REFERENCE).

When **generating or augmenting**: derive one case per behavior, tagged `[Read-only]`/`[Mutating]`;
add a negative case for every touched form, an access-control case for every touched route/action, and
a money-path assertion for any change to a commission/payout service — **citing seeded figures** from
REFERENCE's fixtures (never invent numbers). Ask the **depth tier** — Smoke / Standard (default) /
Thorough — **only** in the generate/augment paths (pure import already defines its own depth); bias
toward Thorough when the scope touches payouts, auth, or access-control.

Slug the feature (branch segment after `feat/`/`fix/`, else the dominant changed path), confirm the
filename, and write `qa/runs/<today>-<slug>.md` from the template in `qa/README.md` — normalizing cases
from **any** source into the `| ID | Case | Type | Status | Notes |` table (status all `⬜`, inline case
definitions, empty run log). **If `qa/` does not exist yet, this is first-time setup — also create
`qa/README.md` + `qa/REFERENCE.md` (§0) and do the CODEMAP / CLAUDE doc updates.**

### 3. Execute — delegate to playwright-driver, record results

1. Pre-flight: confirm the app is running per `qa/REFERENCE.md` (e.g. `lsof -ti:3003`). If it's down →
   **HALT**; ask the developer to start it. Never start it yourself.
2. **Batch** cases by role and by Read-only-before-Mutating. Run all `[Read-only]` cases first (asserts
   pristine seed data), then `[Mutating]` batches serially — never two mutating batches at once.
3. For each batch, spawn the **`playwright-driver`** subagent (Agent tool, `subagent_type: "playwright-driver"`) with:
   the runbook path, the batch's role + type, and the cases (steps + expected, with seeded figures).
   It consults `qa/REFERENCE.md` §UI-conventions/watch-for for targeting and returns
   `<TC-id>: PASS | FAIL | PARTIAL — evidence` lines plus its compact report.
4. **You record the results** — parse the per-id lines and `Edit` the runbook's status table
   (`✅`/`❌`/`⚠️`/`⛔` + evidence + screenshot path), then append a dated Run-log entry. The subagent
   returns a report; it does not touch the runbook or any file.
5. **Continue past individual FAILs.** Halt a batch (mark the rest `⛔ Blocked`) only on a blocker:
   app down, login broken for the role, or a dependency case failing so downstream cases can't run.

### 4. Triage — fix high/blocking, re-run affected

Group findings by severity (Blocking/High = broken core flow, confidentiality leak, wrong money math,
auth/access-control hole; Medium = validation/copy; Low/PM = cosmetic).

**Bug vs intended:** before fixing a deviation, check `qa/REFERENCE.md` §"Watch-for" and the spec
source it names — a "confirm against spec" item (page size, sort states, unauth-redirect target) may be
intended behavior, not a bug. Record and flag those; don't silently fix. Fix genuine High/Blocking in
source (the one phase that edits app code — follow CLAUDE.md doc discipline: update `CODEMAP.md` /
`COMPONENT.md` if you add/rename files or components). Then **re-delegate only the affected TC-ids**,
update their rows, and append a dated "fix pass" Run-log entry citing files changed + live re-verification.

### 5. Graduate — gate committed e2e specs

Resolve High/Blocking first, then ask — AskUserQuestion *"Should this feature get committed Playwright
e2e specs?"*: **Yes** *(recommend for a standalone flow, or anything touching money / auth /
access-control / data isolation)* / **Defer** *(a sub-component that only completes a flow alongside a
sibling feature)* / **No** *(one-off; the runbook record is enough)*.

If **Yes**, author a **small** number of specs for the **critical flows only** (never 1:1 with the
runbook). Reuse the existing e2e infra — do not reinvent it:

- Place under `e2e/<portal>/<name>.spec.ts` (read-only) or `e2e/<portal>/<name>.mut.spec.ts` (writes).
- Consume the role via project `storageState` — the folder picks the session; **no login code**.
- Use `kpi(page, label)` and `openRow(page, text, urlGlob)` from `e2e/helpers.ts`.
- Assert seeded figures from `e2e/constants.ts`; extend constants only for genuinely new data.
- Target by `getByRole` / `getByLabel` / `getByText` (no CSS / test-id); describe `"<Portal> · <Feature>"`.
- Mutating specs: `test.describe.configure({ mode: "serial", timeout: 120_000 })` +
  `test.afterEach(() => reseed())` from `e2e/reseed.ts`.

Run `pnpm test:e2e` (scope with `--project=...` or a single file first, then the full suite). Fix and
re-run on failure. Finally, per the commit-then-delete lifecycle in `qa/README.md`: the runbook was
committed with the feature — **delete it once graduated** (confirm with the developer first; if you
recorded a walkthrough in §5b, do that *before* deleting so its links still resolve while reviewed).

### 5b. Record walkthrough (optional) — a video + trace for QA to watch

After the graduation gate, ask — AskUserQuestion *"Record a QA walkthrough video of the critical
flow(s)?"*: **Yes** *(recommend when a non-developer QA / PM will review this, or the flow is visual)* /
**No** *(default for a pure-logic change the runbook already proves)*. Record by **re-running a spec**
under the video-enabled project — no new test authoring in the common case:

1. **Source spec.** If you graduated (§5), point at that `e2e/<portal>/<flow>.spec.ts`. If graduation
   was Defer/No (no committed spec), author a throwaway `e2e/<portal>/<flow>.walk.ts` — ignored by the
   suite (only `*.spec.ts` runs) — that walks the flow in named `test.step()` blocks, reusing
   `e2e/helpers.ts` (`kpi`, `openRow`) and the role `storageState`.
2. **Run it armed.** The `walkthrough-*` projects are OFF until `WALKTHROUGH=1` arms them:
   `WALKTHROUGH=1 pnpm exec playwright test --project=walkthrough-<role> <spec-path>`
   They record at slow pacing (`slowMo`) → `video.webm` + `trace.zip` into `qa/.media/`.
3. **Harvest + link.** Move the produced `video.webm` + `trace.zip` into `qa/runs/<date>-<slug>/media/`
   and add a `## 📹 Walkthrough` section to the runbook linking both, plus the self-serve viewer line:
   `npx playwright show-trace qa/runs/<date>-<slug>/media/trace.zip`.
4. **Reseed if it mutated** seed data — same discipline as a mutating batch (`qa/README.md`).
5. The media is **gitignored and local** (binaries aren't committed). To hand it to a remote QA, attach
   the `.webm` to the ticket / share a link — the runbook path is for the local reviewer.

## What to skip

- Don't QA unchanged areas — scope strictly to what Phase 1 selected.
- Don't write specs 1:1 with runbook cases — graduate only critical flows.
- Don't hardcode project facts in this skill — env, logins, invariants, and the spec source belong in
  `qa/REFERENCE.md`.
- Don't edit the project's domain doc (e.g. `PRODUCT.md`) — user-initiated only.
- Don't silently fix Low / PM / spec-wording findings — record and recommend.
- Don't start the app or run a production build — if it's down, stop.
- Don't let the `playwright-driver` subagent write the runbook or any file — it returns a report; you write.

## When to bail

- App not running (per `qa/REFERENCE.md`) → stop; ask the developer to start it.
- Login broken for a role → stop that batch; mark its cases `⛔`.
- Scope can't be determined and the developer can't name files/area → stop (can't QA nothing).
- Scope spans many unrelated features → offer to QA them as separate runs.
- A triage fix cascades (many files / architectural) → pause, report, ask whether to continue or split.

## Cross-reference

- **`qa/REFERENCE.md`** — project invariants, UI conventions, watch-for classes, spec source (scaffold it if missing).
- **`playwright-driver`** subagent — drives the live browser; this skill orchestrates it.
- **`e2e/README.md`** + **`e2e/TEST-PLAN.md`** — e2e infra conventions and the seed-data source of truth.
- **`update-codemap`** / **`update-component`** — run after any Triage / Graduate file changes.
- **`qa/README.md`** — runbook format and the commit-then-delete lifecycle.
