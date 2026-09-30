---
name: record-changelog
description: This skill should be used when the user wants to record, update, or generate a changelog / release notes describing what has shipped — new features, bug fixes, and improvements — in a shareable, publishable form. Trigger on "record the changelog", "update the changelog", "add a changelog entry", "generate release notes", "draft release notes", "what changed / what shipped", "write up what we did for users", or "changelog this". It gathers the real changes (git commits since the last release/tag + the current session's intent), curates them into user-facing entries grouped by category, and writes a dated section to CHANGELOG.md (and optionally a standalone entry for public docs). This is the curated, customer-facing counterpart to `save-session` (which dumps the raw transcript).
---

# Record Changelog

Turns the work that has actually shipped into a **curated, user-facing changelog entry** — the kind you can paste into a release announcement, share with customers, or lift into public documentation. It distills *what changed and why it matters to users*, rather than dumping raw commits or the conversation.

## When to use

Trigger when the user wants to capture accomplishments for an audience: "record the changelog", "update the changelog", "add a changelog entry", "generate release notes", "draft release notes for this batch", "write up what we shipped", "what changed since the last release", "changelog this".

Do **not** use it to dump the transcript or to write internal commit messages (that's the `git-commit` skill). This produces audience-facing notes.

## How it works

1. **Gather** the raw material with the helper script (git commits in a range + diffstat + the current session's prompts for intent). Run it from the repo root:

   ```bash
   node ".claude/skills/record-changelog/scripts/gather-changes.mjs" --root "$(pwd)"
   ```

   By default the range starts at the latest git tag (else the last 30 commits). Override with `--since <ref|date>` (e.g. `--since v1.4.0`, `--since 2026-06-01`, `--since origin/main`, `--since <hash>`) and `--until <ref>`. The script prints JSON — it never writes anything.

2. **Curate** the JSON into user-facing entries (this is the judgment step — see *Writing the entry*).

3. **Write** the entry to `CHANGELOG.md` at the repo root (prepend a new dated section), and optionally a standalone file under `changelog/` for the public-docs pipeline.

4. **Report** the path(s) written and a one-line summary.

## Steps

1. **Resolve the range.** Default `--root` to the repo root. If the user names a release boundary ("since the last release", "for v2.0", "everything on this branch"), pass `--since` (for a not-yet-tagged release, `--since origin/main` captures everything the current branch adds). Run the gather script and read the JSON.

2. **Confirm scope if ambiguous.** If the range spans a lot (dozens of commits across unrelated areas) or you can't tell what's user-facing, ask the user for the version/label and the audience before writing. Otherwise proceed with sensible defaults.

3. **Curate** (see *Writing the entry* below).

4. **Write** to `CHANGELOG.md`:
   - If the file doesn't exist, create it with a [Keep a Changelog](https://keepachangelog.com)-style header.
   - **Prepend** the new section directly under the header (newest first). Never rewrite existing entries.
   - If the user asked for a standalone/publishable unit, also write `changelog/<YYYY-MM-DD>-<slug>.md` with just this entry so it can be dropped into public docs.

5. **Report** the written path(s) + a short summary (e.g. "Added 4, Fixed 2, Security 1").

## Writing the entry

The entry is for humans who use the product, not for engineers reading diffs. Translate commits into outcomes.

**Structure** (per release/date):

```markdown
## [<version or Unreleased>] — <YYYY-MM-DD>

<One or two sentences of plain-language highlights: the headline changes and why they matter.>

### Added
- <User-facing capability, in benefit terms.> <!-- ref: <ticket or shortHash> -->

### Changed
- <What behaves differently now, and any action the user should take.>

### Fixed
- <The problem the user would have felt, now resolved.>

### Security
- <Hardening the user should know about, without exploit detail.>
```

**Curation rules:**

- **Group by user impact**, using the [Keep a Changelog](https://keepachangelog.com) categories: **Added, Changed, Deprecated, Removed, Fixed, Security**. Omit empty categories.
- **Map conventional-commit types → categories** as a starting point (the JSON includes a parsed `type`): `feat`→Added; `fix`/`hotfix`→Fixed; a behavior-changing `change`/`refactor`/`perf`→Changed (only if users notice); security work→Security; removals→Removed. Use judgment, not a blind mapping. This repo also uses `change:`, `ticket:`, `task:`, `learn:`, `spec:`, `CR:` prefixes — treat `task`/`ticket`/`learn`/`spec`/`docs`/`chore`/`cleanup`/`tests` as internal and drop them.
- **Collapse noise.** Squash multiple commits for one feature (and its follow-up `learn:`/`task:` commits) into a single bullet. **Drop** pure-internal churn — ticket scaffolding, dependency bumps, tooling changes, and refactors with no user-visible effect — unless the user explicitly wants an engineering changelog.
- **Write in the user's language.** "You can now share a personal referral link" — not "add Partner.referralCode + /r/[code] route". Lead with the benefit.
- **Lead the release with a short Highlights sentence** so it can be reused verbatim as a release announcement.
- **Flag breaking changes** prominently (the JSON marks `breaking`): a **⚠️ Breaking** note with the required migration step.
- **Keep traceability without clutter.** Put the ticket id or commit ref in an HTML comment (`<!-- ref: TKT-002 -->`) so it survives for engineers but renders invisibly in public docs. Do not paste raw hashes into the visible text.
- **Match the repo's tone + rules.** Per the workspace `CLAUDE.md`, changelog text (like commits/PRs) must contain **no AI/tool attribution** — write it as the team's own voice. Never invent changes not supported by the gathered commits/diff.

## Options

- `--since "<ref|date>"` / `--until "<ref>"` — bound the range (default: latest tag → HEAD).
- `--root "<dir>"` — the repo (default: cwd).
- `--no-session` — skip reading the current session's prompts (use for a pure git-range changelog, e.g. in CI).
- `--max <n>` — cap commits returned (default 200).

## Notes

- **Two audiences, one source.** The `CHANGELOG.md` entry serves both a user-facing announcement (the Highlights line + Added/Fixed bullets) and the public-docs pipeline (the full categorized entry). Write once, reuse both ways.
- The script is read-only; all writes go through the model, so tone and grouping stay under review.
- Re-running for the same range should **update** the top entry, not duplicate it — read the current top of `CHANGELOG.md` first and merge.
- Prefer real release boundaries (`--since <last tag>` / `--since origin/main`) over session scope when cutting a release; use session prompts mainly to understand *intent* behind the commits.
