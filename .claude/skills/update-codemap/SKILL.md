---
name: update-codemap
description: Use this skill when files are added, renamed, removed, or moved under src/, prisma/, scripts/, or any top-level folder of the project. Also use when the user says "update CODEMAP", "refresh CODEMAP", "sync CODEMAP", "regenerate CODEMAP", or after completing any code change that introduces a new service, action, hook, query, component category, route, or top-level folder. Reads the current file tree, diffs it against CODEMAP.md, and updates the project tree, "Where to add what" table, and architecture notes to reflect reality.
---

# Update CODEMAP.md

You are updating `CODEMAP.md` to reflect the current state of the codebase. CODEMAP.md is the map agents read to know where things live — if it drifts from reality, future Claude sessions waste tokens re-discovering structure.

## When to invoke

Trigger any time the file tree under `src/`, `prisma/`, `scripts/`, or the project root has changed in a way that would affect CODEMAP.md. Specifically:

- **New service** in `src/lib/services/`
- **New action** in `src/lib/actions/`
- **New query hook** in `src/lib/queries/`
- **New route** under `src/app/`
- **New component** in `src/components/<subdir>/` (but for components, also update `COMPONENT.md` — that's a separate skill / discipline)
- **New top-level folder** anywhere
- **Renamed or removed** anything in the categories above
- **New Prisma model** added to `prisma/schema.prisma`

If the change is purely additive to an existing service (new function in the same file), CODEMAP.md doesn't need to change — only update when *files* or *folders* shift, or when "Where to add what" guidance changes.

## Procedure

### 1. Capture the current state

Run these in parallel:

```bash
# Project tree under src/ (skip node_modules, .next, dist, etc.)
find src -type f -name "*.ts" -o -name "*.tsx" | sort

# Top-level folder list
ls -la

# Prisma models (model declarations)
grep -E "^model " prisma/schema.prisma

# Routes (app router pages)
find src/app -name "page.tsx" -o -name "layout.tsx" | sort
```

### 2. Diff against CODEMAP.md

Read `CODEMAP.md`. Compare:

- **Project tree section** — does it match what's actually on disk? Look for entries that no longer exist, or files on disk that aren't listed.
- **"Where to add what" table** — does it cover the new category? If a new subdir appeared (e.g., `src/lib/integrations/`), add a row.
- **Architecture section** — if the data flow changed (e.g., a new layer between services and actions), update.
- **React Query / Zustand / Auth / Database sub-sections** — update if those concerns gained or lost moving parts.

### 3. Apply minimal edits

Use the `Edit` tool with surgical replacements — don't rewrite the whole file unless the structure has fundamentally changed.

- **Adding a file**: insert one line in the tree, matching the indentation and `# comment` format of neighbors. Use a brief, action-focused description.
- **Removing a file**: delete the line and any orphaned parent folder line.
- **New subfolder**: add a row to "Where to add what", an entry in the tree, and a short explanation if needed.
- **New top-level concern**: may warrant a new section. Keep it brief — CODEMAP.md is a map, not a manual.

### 4. Preserve style

CODEMAP.md follows these conventions:

- Project tree uses ASCII art (`├──`, `│`, `└──`) with `# comments` after the filename
- Code conventions are bulleted short statements
- The "Where to add what" table is the canonical lookup — keep it dense
- Don't add prose paragraphs where a table or list works
- Don't duplicate content already in CLAUDE.md, DESIGN.md, COMPONENT.md, STACK.md, or PRODUCT.md — link instead

### 5. Verify

After editing:

- Read the updated CODEMAP.md to confirm the tree matches reality
- Spot-check: pick 3 random files from the tree, confirm they exist on disk
- Spot-check: pick 3 random files on disk, confirm they appear in the tree

### 6. Commit

When the user is ready to commit, the commit prefix is `docs:` (per CLAUDE.md commit conventions). Example message:

```
docs: refresh CODEMAP.md after adding integrations layer
```

## What to skip

- **Storybook files** (`.stories.tsx`) — these belong in `COMPONENT.md`, not `CODEMAP.md`. The tree shows the component file (e.g., `button.tsx`), not the story.
- **Test files** — only show test infrastructure files (e.g., `vitest.config.ts`), not every individual test.
- **Generated files** — Prisma client output, `.next/`, `node_modules/`, build artifacts.
- **Per-component prop docs** — those are `COMPONENT.md`'s job.

## When to bail

If the codebase has diverged substantially from CODEMAP.md (e.g., 20+ new files across many folders, architecture has shifted), the right move is **not** to edit-in-place. Surface to the user:

> "CODEMAP.md is significantly stale — multiple categories changed. Want me to regenerate it from scratch using the current tree, or update incrementally section-by-section?"

Let the user pick the approach.
