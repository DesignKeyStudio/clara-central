---
description: Create a structured ticket document for changes, bug fixes, or improvements needed after initial implementation
allowed-tools: Bash, Read, Write, Glob, Grep, AskUserQuestion
---

# /ticket — Create Ticket Document

Create a structured ticket document for post-implementation changes.

## Usage

```
/ticket <description of the change needed>
```

## Arguments

**Change description** is provided as: $ARGUMENTS

If no description is provided, ask the user what needs to be changed.

## Instructions

### 1. Determine the Next Ticket Number

Scan `docs/tickets/` for existing `TKT-*.md` files:
```
Glob: docs/tickets/TKT-*.md
```

Extract the highest number and increment. If no tickets exist, start at TKT-001.

### 2. Understand the Change

**Before asking any questions, preserve the raw initial request** exactly as the user provided it in `$ARGUMENTS` (or the follow-up message if `$ARGUMENTS` was empty). This raw text is stored verbatim in the ticket under the "Initial Request" section so we can later review how the original input was phrased and identify opportunities to coach the requester on writing clearer tickets. Do not clean it up, rephrase it, or summarize it — copy it as-is (including typos, casing, and grammar).

Ask the user 2-4 focused questions:
- **Type**: Bug / Task / Feature / Change Request — how the requester is positioning this ticket?
  - **Bug** — something is broken or behaving incorrectly vs. the spec
  - **Task** — a discrete piece of work (chore, cleanup, configuration, investigation) that isn't a new feature or a bug
  - **Feature** — net-new functionality or capability for users
  - **Change Request** — modification to existing functionality, UX, or behavior (not a bug, not net-new)
- Which pages or features are affected (Admin portal, Partner portal, or both)?
- What is the expected behavior vs. current behavior?
- Priority: High (blocking), Medium (should fix soon), Low (improvement)?

If the user's input already makes the type obvious (e.g. "fix partner commission calculation" → Bug, "add CSV export for referrals" → Feature), propose the type in your question and let them confirm or override rather than asking blindly.

### 2b. Determine Dependencies

Check if this ticket depends on another pending ticket:
- **Depends On: none** — Default. The ticket touches independent files/features.
- **Depends On: TKT-NNN** — Set when this ticket requires another ticket to be completed first.
- **Depends On: TKT-001, TKT-002** — Multiple dependencies (comma-separated).

**Rule:** Most tickets are independent (`none`). Only set a dependency when the ticket literally cannot work without the other being done first, so independent tickets can be picked up in any order.

### 3. Research Context

Read the relevant files to understand the current implementation:
- `PRODUCT.md` — domain model and MVP scope
- `CODEMAP.md` — file tree to find relevant source files
- Actual source files that are affected by the change

### 4. Create the Ticket Document

Write to `docs/tickets/TKT-{NNN}-{slug}.md`:

```markdown
# Ticket TKT-{NNN} — {Title}

**Type:** {Bug / Task / Feature / Change Request}
**Priority:** {High / Medium / Low}
**Status:** Pending
**Depends On:** {comma-separated TKT-NNN IDs, or "none" if independent}
**Feature Areas:** {comma-separated feature areas — e.g., "Admin/Partners, Partner/Earnings"}
**Created:** {date}

## Initial Request

> {The raw, unedited request from the developer or PM exactly as they typed it — including typos, casing, phrasing, and grammar. This is intentionally preserved verbatim so we can audit how the requester framed the work and identify coaching opportunities. Do NOT clean this up, paraphrase, or condense it.}

## Problem

{Clear, cleaned-up description of what's wrong, missing, or needs to change — this is the AI's interpretation of the Initial Request above, with the ambiguity resolved via the clarifying questions in step 2.}

## Changes

### A. {Change Group Title}

**Affected files:**
- `{file path 1}`
- `{file path 2}`

**Changes:**
1. {Specific change — be precise about what to modify}
2. {Include code snippets if the change is non-obvious}

**Verification:**
- [ ] {How to verify this section works}
- [ ] {Another verification step}

### B. {Another Change Group}
{Repeat as needed}

## Task Checklist

- [ ] Section A: {summary}
- [ ] Section B: {summary}
- [ ] Build verification passes (`pnpm build`)
- [ ] UI verification passes (the `playwright-driver` subagent, or a browser MCP)
- [ ] This ticket moved to `docs/tickets/completed/` when all sections are done

## Issue References

{If this ticket fixes reported bugs, link them here — e.g. GitHub issue numbers.}
- #{issue} — {one-line summary}

**Post-fix rules:**
- Close the linked issues, referencing the commit or PR that fixed them
- After all sections in this ticket are complete, change Status to "Complete" and move it to `docs/tickets/completed/`
- Only pending work stays in `docs/tickets/` — completed tickets live in `docs/tickets/completed/`

## References

- Product doc: `PRODUCT.md` — {which domain area is affected}
- Code map: `CODEMAP.md` — {which section covers the affected code}
```

### 5. Summary

After creating the ticket, output:
- Ticket file path
- Summary of what it covers
- Which files it will most likely touch
