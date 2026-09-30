---
name: update-component
description: Use this skill when files are added, renamed, or removed under src/components/, when a variant/prop is added to an existing component, or when the user says "update COMPONENT", "refresh COMPONENT", "sync COMPONENT", "catalog component", or "regenerate component catalog". Reads the components directory tree, diffs it against COMPONENT.md, and updates entries (purpose, variants, story references) to reflect reality.
---

# Update COMPONENT.md

You are updating `COMPONENT.md` to reflect the current state of `src/components/`. COMPONENT.md is the catalog agents read to find components and know their variants — if it drifts, future Claude sessions add duplicate components or miss existing ones.

## When to invoke

Trigger when:

- **New component file** appears in `src/components/<subdir>/<name>.tsx`
- **Component file is renamed or removed**
- **A variant is added** to an existing component (new entry in `cva()` variants, new size, new state)
- **A new subdirectory** appears under `src/components/`
- **User asks** to "update / refresh / sync / regenerate COMPONENT.md" or "catalog components"

If the change is internal-only (refactoring without surface change), COMPONENT.md doesn't need updating.

## Procedure

### 1. Capture the current state

Scan `src/components/`:

```bash
# All component files (excluding stories)
find src/components -name "*.tsx" ! -name "*.stories.tsx" | sort

# Story files (for cross-reference)
find src/components -name "*.stories.tsx" | sort

# Subdirectories
ls -d src/components/*/
```

For each component file found, you may need to read it to extract:

- **Variants** — look for `cva()` `variants:` block, or `VariantProps<typeof ...>`
- **Size options** — typically inside the same `cva()` or as discrete props
- **Purpose** — top-of-file JSDoc comment if present

For shadcn primitives, you can often skip reading the file — the variants/sizes are well-known and unchanged from shadcn defaults.

### 2. Diff against COMPONENT.md

Read `COMPONENT.md`. Compare:

- **Entries present on disk but missing in catalog** → add
- **Entries in catalog but file missing on disk** → remove
- **Variants on disk that don't match the catalog entry** → update
- **Story file existence** → add or remove the `Story: <path>` line

### 3. Apply minimal edits

Use the `Edit` tool. Don't rewrite the whole catalog.

**Entry format** (use exactly this shape):

```markdown
### ComponentName — `<subdir>/<file>.tsx`
One-line purpose statement.
- Variants: `default | other | options` *(omit line if no variants)*
- Sizes: `sm | default | lg` *(omit line if no sizes)*
- Use for: when this is the right choice *(only for custom/layout where the choice isn't obvious)*
- Don't use for: when to reach for a different component *(only when there's a sibling that's easy to confuse)*
- Story: `<subdir>/<file>.stories.tsx` *(omit if no story file exists)*
```

**Adding a new entry**: find the right alphabetical position within the right subdir section. Match the depth of surrounding entries.

**Removing**: delete the entry block plus the blank line that follows it.

### 4. Preserve catalog structure

COMPONENT.md is organized by subdirectory:

- `src/components/ui/` — shadcn primitives (terse entries)
- `src/components/reui/` — ReUI components (terse entries)
- `src/components/custom/` — generic app components (slightly more context — purpose, when to use)
- `src/components/layout/` — app chrome (slightly more context)
- `src/components/data-table/` — table composition (slightly more context)

Components are **alphabetized within each subdir**. New entries go in alphabetical position, not at the end.

The "Component categories" table at the top of the catalog includes an "Edit policy" column. If you add a new subdir, also add a row there.

### 5. Cross-check with DESIGN.md

If a new component pattern is added that should have token-level rules (e.g., `button-tertiary`), surface to the user:

> "I added `<ComponentName>` to COMPONENT.md. Should I also add a `components.<name>` block to DESIGN.md's YAML front matter?"

Only the user can decide whether a new component pattern is reusable enough to deserve design-token entries.

### 6. Verify

After editing:

- Read COMPONENT.md and spot-check 3 random entries against actual files
- Check entry count roughly matches: `grep -c '^### ' COMPONENT.md` should equal the count of non-story `.tsx` files under `src/components/`

### 7. Commit

When the user is ready to commit, the prefix is `docs:` (per CLAUDE.md commit conventions). Example:

```
docs: catalog new ToggleGroup component in COMPONENT.md
```

## What to skip

- **`.stories.tsx` files** — they're referenced as `Story:` lines on the parent component's entry, not their own entries
- **`index.ts` re-exports** — these are plumbing, not components
- **Internal sub-files of compound components** — e.g., `data-grid-table-virtual.tsx` is a sub-component of DataGrid; list it under the DataGrid bullet list rather than as a top-level entry
- **Test files**

## When to bail

If `src/components/` has shifted substantially (new subdirs, 10+ new components, organizational restructure), don't try to edit-in-place. Surface to the user:

> "COMPONENT.md is significantly out of date — the catalog structure may need a refresh. Want me to regenerate it from scratch, or update incrementally?"

Let the user pick.

## Cross-reference

When updating COMPONENT.md, also check whether [CODEMAP.md](../../CODEMAP.md) needs updating (e.g., new subdir under `src/components/` should appear there too). If yes, suggest invoking the `update-codemap` skill afterward.
