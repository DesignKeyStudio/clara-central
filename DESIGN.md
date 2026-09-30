---
version: alpha
name: Clara Central
description: >
  Bookkeeping software with the calm of a well-kept ledger. Warm
  manila-paper surfaces and a green-black ink set a quiet, trustworthy
  tone; a single deep accounting-green carries every action while a
  muted gold carries brand identity. Contrast is low and structural —
  hierarchy comes from surface, weight, and spacing, never decoration.
colors:
  # ── Surfaces ──
  bg:          "#FFFDF9"   # page canvas — warm off-white (manila paper)
  bg-sidebar:  "#FFFFFF"   # sidebar surface, lifted off the canvas by shadow
  bg-card:     "#FFFFFF"   # raised surface (stat cards, table) — white + soft shadow
  bg-subtle:   "#FEFCF6"   # faint warm strip (table header row)
  bg-input:    "#FFFFFF"   # form-control surface — white with a border
  bg-hover:    "#F7F5F3"   # warm-gray interactive state (active nav, ghost button)
  border:      "#EFEDE9"   # the single border value — dividers, outlines, pills
  scrim:       "rgba(31, 30, 26, 0.40)"   # modal / sheet backdrop (warm black)
  # ── Text ──
  text:        "#0A0A0A"   # primary body text (near-black ink)
  text-muted:  "#737373"   # secondary: nav, labels, table body, entry tags
  text-subtle: "#9E9D9D"   # tertiary: uppercase eyebrow labels, placeholders
  text-disabled: "{colors.text-subtle}"
  text-inverse: "#F7F7F7"  # labels on accent / dark surfaces
  # ── Brand & action ──
  accent:        "#00685B" # interactive / action color (deep accounting green)
  accent-strong: "#21533A" # hover / pressed darken of accent
  accent-bg:     "#ECF4EC" # soft accent surface (selected rows, success tint)
  brand:         "#865F11" # identity color (gold): wordmark, active nav, gold avatars
  brand-bg:      "#F6F2EA" # soft gold surface (gold avatar background)
  focus-ring:    "rgba(0, 104, 91, 0.30)"  # accent @ 30% — keyboard focus outline
  # ── Semantic (status & feedback) ──
  # Tuned to the warm, muted register — no bright or cold hues.
  # Accounting logic: green = in the black, red = in the red.
  success:     "#009F69"           # Approve action + "Approved" status (pinned)
  success-strong: "#00875A"        # hover / pressed darken of success
  success-bg:  "{colors.accent-bg}"
  warning:     "#8F5A0C"           # "Pending" / caution   (muted amber)
  warning-bg:  "#F5EAD2"
  error:       "#BE3219"           # "Rejected" / destruct (brick — "in the red")
  error-bg:    "#F3E1DC"
  primary:     "{colors.accent}"
# Accent surface tints — used only for avatar monograms, which alternate by row.
accentTints:
  gold-bg:  "{colors.brand-bg}"   # gold avatar background  (text {colors.brand})
  gold-fg:  "{colors.brand}"
  teal-bg:  "{colors.accent-bg}"  # teal avatar background  (text {colors.accent})
  teal-fg:  "{colors.accent}"
typography:
  # Two families only: Fraunces (display, bookish identity) + IBM Plex Sans (everything else).
  display:        # page title ("Partners") — the largest type realized on screen
    fontFamily: Fraunces
    fontSize: 1.75rem      # 28px
    fontWeight: 600
    lineHeight: 1.14
    letterSpacing: "-0.021em"
  h1:             # brand wordmark ("Clara Central")
    fontFamily: Fraunces
    fontSize: 1.5rem       # 24px
    fontWeight: 600
    lineHeight: 0.94
    letterSpacing: "-0.016em"
  h2:             # section heading (not on Partners screen — sized for the scale)
    fontFamily: Fraunces
    fontSize: 1.25rem      # 20px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.012em"
  h3:             # sub-section heading
    fontFamily: IBM Plex Sans
    fontSize: 1rem         # 16px
    fontWeight: 600
    lineHeight: 1.4
  metric:         # stat-card figures (5, 4, 0, $2,050.00). tabular-nums is RECOMMENDED — source is not tabular
    fontFamily: IBM Plex Sans
    fontSize: 2rem         # 32px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.019em"
    fontVariantNumeric: tabular-nums
  numeric:        # money & numeric table columns — tabular, aligns decimals
    fontFamily: IBM Plex Sans
    fontSize: 0.875rem     # 14px
    fontWeight: 400
    lineHeight: 1.43
    fontVariantNumeric: tabular-nums
  body-md:        # page subtitle, larger body
    fontFamily: IBM Plex Sans
    fontSize: 1rem         # 16px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:        # table cells, nav items, pagination, helper text
    fontFamily: IBM Plex Sans
    fontSize: 0.875rem     # 14px
    fontWeight: 400
    lineHeight: 1.43
  button:         # Invite Partner, View — RULE: labels are Title Case (all words capitalized)
    fontFamily: IBM Plex Sans
    fontSize: 0.875rem     # 14px
    fontWeight: 500
    lineHeight: 1.43
  stat-label:     # stat-card captions ("Total partners") — sentence case, tracked
    fontFamily: IBM Plex Sans
    fontSize: 0.75rem      # 12px
    fontWeight: 600
    lineHeight: 1.375
    letterSpacing: "0.046em"
  table-header:   # column headers — uppercase
    fontFamily: IBM Plex Sans
    fontSize: 0.75rem      # 12px
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "0.025em"
    textTransform: uppercase
  eyebrow:        # sidebar section labels ("Admin Panel", "Referral Program")
    fontFamily: IBM Plex Sans
    fontSize: 0.75rem      # 12px
    fontWeight: 500
    lineHeight: 1.375
    letterSpacing: "0.046em"
    textTransform: uppercase
rounded:
  sm: 4px      # checkbox, entry tag
  md: 6px      # buttons, inputs, search, nav items, pagination, view button
  lg: 12px     # cards, table container
  pill: 9999px # status pills, avatars
spacing:
  xs: 4px      # micro gaps (dot ↔ label, icon insets)
  sm: 8px      # small gaps (toolbar checkbox group, pager)
  md: 12px     # control padding, toolbar gap
  lg: 16px     # card inner padding, stat-card gap
  xl: 24px     # gap between sections (header → stats → toolbar → table)
  xxl: 32px    # page gutter
elevation:
  # White cards sit on the warm canvas, so they need a whisper-soft, WARM shadow
  # (not a cool black one) to separate. This is the single elevation method.
  card:     "0px 0px 20px rgba(168, 163, 148, 0.15)"
  sidebar:  "0px 0px 20px rgba(168, 163, 148, 0.15)"
  popover:  "0px 8px 24px rgba(168, 163, 148, 0.22)"   # menus/dialogs — slightly deeper
components:
  # ── Action ──
  button:                  # primary — solid accent green, near-white label
    backgroundColor: "{colors.accent}"
    textColor: "{colors.text-inverse}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  button-hover:
    backgroundColor: "{colors.accent-strong}"
    textColor: "{colors.text-inverse}"
  button-ghost:            # e.g. row "View" — warm-gray fill, gold-brown label
    backgroundColor: "{colors.bg-hover}"
    textColor: "#94722D"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  button-destructive:
    backgroundColor: "{colors.error}"
    textColor: "{colors.text-inverse}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  button-approve:          # RULE: the Approve action ALWAYS uses success green (#009F69)
    backgroundColor: "{colors.success}"   # never {colors.accent} — positive action is distinct
    textColor: "{colors.text-inverse}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  button-approve-hover:
    backgroundColor: "{colors.success-strong}"
    textColor: "{colors.text-inverse}"
  button-dialog-primary:   # RULE: the primary action INSIDE a dialog uses ink black, not accent green
    backgroundColor: "{colors.text}"        # #0A0A0A — calmer than green inside an overlay
    textColor: "{colors.text-inverse}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  button-dialog-primary-hover:
    backgroundColor: "#262626"              # slight lift of ink black on hover
    textColor: "{colors.text-inverse}"
  button-disabled:
    backgroundColor: "{colors.bg-hover}"
    textColor: "{colors.text-disabled}"
  toggle:
    backgroundColor: "{colors.bg-hover}"
    textColor: "{colors.text}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
  toggle-active:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.text-inverse}"
  toolbar:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
  # ── Form ── (all controls share a white surface + the single border)
  input:
    backgroundColor: "{colors.bg-input}"
    textColor: "{colors.text}"
    border: "{colors.border}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
    fontSize: "GOTCHA — the Input ships `md:text-sm`; to change a field's size you MUST also override the `md:` variant (e.g. `text-xl md:text-xl`), or it snaps back to 14px on ≥md screens"
    autofill: "browser autofill tint (Chrome blue / Safari yellow) is overridden globally via `input:-webkit-autofill` in globals.css (box-shadow inset repaint), so prefilled fields keep the card surface + ink"
  input-focus:
    border: "{colors.accent}"
    ring: "{colors.focus-ring}"
  search:                  # NOTE: Clara uses md radius here, not a pill
    backgroundColor: "{colors.bg-input}"
    textColor: "{colors.text}"
    border: "{colors.border}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  select:
    backgroundColor: "{colors.bg-input}"
    textColor: "{colors.text}"
    border: "{colors.border}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  checkbox:
    backgroundColor: "{colors.bg-input}"
    border: "{colors.border}"
    textColor: "{colors.accent}"     # check mark / selected fill
    rounded: "{rounded.sm}"
    size: 16px
  switch:
    backgroundColor: "{colors.bg-hover}"
    textColor: "{colors.text-inverse}"
    rounded: "{rounded.pill}"
  switch-on:
    backgroundColor: "{colors.accent}"
  label:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    typography: "{typography.stat-label}"
  # ── Navigation ── (transparent, belong to the page)
  link:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    typography: "{typography.body-sm}"
  link-hover:
    textColor: "{colors.accent-strong}"
  navigation-menu:         # sidebar item, resting
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "10px"          # off the 4px scale (drift); was mis-documented as spacing.md (12px)
  navigation-menu-active:  # current page — warm-gray fill, BRAND gold label, bold
    backgroundColor: "{colors.bg-hover}"
    textColor: "{colors.brand}"
  pagination:
    backgroundColor: "{colors.bg-input}"
    textColor: "{colors.text}"
    border: "{colors.border}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
  dropdown-menu:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.text}"
    border: "{colors.border}"
    shadow: "{elevation.popover}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
  # ── Overlay ──
  dialog:
    backgroundColor: "{colors.bg-card}"   # white surface
    textColor: "{colors.text}"
    scrim: "{colors.scrim}"
    shadow: "{elevation.popover}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"               # 12px
    padding: "{spacing.xl}"
    maxHeight: "88vh"                      # RULE: caps at 88% of the viewport height
    overflow: "outer shell is a non-scrolling bg-card backstop (holds the transform/rounding/shadow); an inner region scrolls. Header/footer stay sticky against the untransformed inner scroller, so they never drift and no gap can expose the overlay"
    overscroll: "page rubber-band is disabled globally (overscroll-behavior:none on html/body in globals.css) so the position:fixed dialog never jolts at the scroll extremes"
    footer: "sticky to the bottom — action buttons stay reachable while the body scrolls"
    width: "create/edit FORM dialogs all use max-w-lg (512px) — the standard; the media-preview dialog uses max-w-4xl; minimal confirms use max-w-sm/md. Don't exceed lg for a form dialog."
  popover:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.text}"
    border: "{colors.border}"
    shadow: "{elevation.popover}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
  tooltip:
    backgroundColor: "{colors.text}"
    textColor: "{colors.text-inverse}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
  # ── Feedback ──
  status:                  # outlined pill: tone-colored border + matching colored label + tone icon (no fill, no dot)
    # PLACEMENT RULE: in a detail view the status pill ALWAYS sits at the HEADER level,
    # inline (gap 10px) to the RIGHT of the entity title — never inside the body.
    backgroundColor: "transparent"
    border: "{colors.success}"                # border @ ~40%; border, label, and icon share the tone color
    textColor: "{colors.success}"
    typography: "{typography.body-sm}"        # 14px / font-medium
    rounded: "{rounded.pill}"
    padding: "{spacing.sm}"
    icon: "tone glyph — check (success) / clock (warning) / x (error) / minus (neutral)"
  status-approved:         # border, label, and icon all keyed to the tone color
    color: "{colors.success}"
  status-pending:
    color: "{colors.warning}"
  status-rejected:
    color: "{colors.error}"
  alert:                   # neutral
    backgroundColor: "{colors.bg-card}"
    border: "{colors.border}"
    textColor: "{colors.text}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  alert-success:
    backgroundColor: "{colors.success-bg}"
    textColor: "{colors.success}"
  alert-warning:
    backgroundColor: "{colors.warning-bg}"
    textColor: "{colors.warning}"
  alert-error:
    backgroundColor: "{colors.error-bg}"
    textColor: "{colors.error}"
  toast:                   # transient, inverts to dark ink
    backgroundColor: "{colors.text}"
    textColor: "{colors.text-inverse}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  progress:
    backgroundColor: "{colors.bg-hover}"
    textColor: "{colors.accent}"
    rounded: "{rounded.pill}"
  spinner:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    size: 24px
  skeleton:
    backgroundColor: "{colors.bg-hover}"
    rounded: "{rounded.sm}"
  empty-state:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    typography: "{typography.body-md}"
    padding: "{spacing.xxl}"
  # ── Data Display ──
  avatar:                  # 28px monogram circle; tint ALTERNATES by row (see prose)
    backgroundColor: "{accentTints.gold-bg}"   # row-even uses teal-bg / teal-fg
    textColor: "{accentTints.gold-fg}"
    typography: "{typography.stat-label}"
    rounded: "{rounded.pill}"
    size: 28px
  badge:                   # solid accent — counts / emphasis
    backgroundColor: "{colors.accent}"
    textColor: "{colors.text-inverse}"
    typography: "{typography.stat-label}"
    rounded: "{rounded.pill}"
    padding: "{spacing.xs}"
  tag:                     # entry marker ("Self sign-up", "Invited") — quiet, no fill
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    typography: "{typography.stat-label}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs}"
  table:
    backgroundColor: "{colors.bg-card}"
    headerColor: "{colors.bg-subtle}"
    border: "{colors.border}"
    textColor: "{colors.text}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
  data-table:
    backgroundColor: "{colors.bg-card}"
    headerColor: "{colors.bg-subtle}"
    border: "{colors.border}"
    textColor: "{colors.text}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
  # ── Layout ──
  card:                    # white surface, lifted by warm shadow (no border)
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.text}"
    shadow: "{elevation.card}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  sidebar:
    backgroundColor: "{colors.bg-sidebar}"
    textColor: "{colors.text}"
    shadow: "{elevation.sidebar}"   # separated by shadow only — no border
  separator:
    backgroundColor: "{colors.border}"
    height: 1px
  icon:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    size: 16px
patterns:
  # Recurring compositions. Components are the parts; patterns are the assemblies.
  # Each references components/tokens so a change to the base cascades upward.
  app-sidebar:
    surface: "{colors.bg-sidebar}"
    shadow: "{elevation.sidebar}"      # separated by shadow only — no right border
    width: "290px"
    structure: "brand block → 'Referral Program' eyebrow → nav list → user footer (pinned to bottom)"
    parts:
      brand: "SVG brand lockup (glyph + 'ClaraCentral' wordmark, 50px tall) + 'Admin Panel' ({typography.eyebrow}) + collapse button; collapsed rail swaps in the glyph-only mark"
      group-label: "{typography.eyebrow} in {colors.text-subtle}  (e.g. 'Referral Program')"
      item: "{components.navigation-menu}  (16px icon + label, 10px padding, 6px radius)"
      item-active: "{components.navigation-menu-active}  (bg-hover fill + brand-gold label, bold)"
      user-footer: "28px avatar (initials) + name ({typography.body-sm}) — name only, no role line"
    notes:
      - "The active item also contains a 3x20px accent-bar element ({colors.accent}) that is currently HIDDEN; the visible active treatment is the bg-hover fill + gold bold label only."
  page-header:
    structure: "title block (left) + primary action (right)"
    parts:
      title: "{typography.display}"
      status: "{components.status}  — inline, 10px to the RIGHT of the title (detail views only)"
      subtitle: "{typography.body-md} in {colors.text-muted}"
      action: "{components.button}  (primary, top-right)"
    spacing: "{spacing.xl} below, before the next section"
    rules:
      - "A record's status pill ALWAYS lives in the header next to the title — never in the body. Apply to every detail/record window (partner, referral, payout, …)."
  stat-card:
    base: "{components.card}"          # bg-card white + elevation.card shadow + rounded.lg (12px)
    structure: "label (top) + metric figure (below)"
    grid: "4 across, 16px gap"
    padding: "17px"                    # NOTE: off the 4px scale (drift); ideally {spacing.lg}
    parts:
      label: "{typography.stat-label} in {colors.text-muted}"
      figure: "{typography.metric} in {colors.text}"
    rules:
      - "No decorative icons — the figure is the content."
      - "All four cards use ONE identical treatment — no hero / emphasis / tinted variant in the current file."
      - "A real zero stays in {colors.text}; it is data, not an error."
  toolbar:
    structure: "search (fills width) + secondary controls + result count (far right)"
    spacing: "{spacing.md} gap between controls"
    parts:
      search: "{components.search}  (flex-grow)"
      controls: "{components.checkbox} + {components.select}"
      count: "{typography.body-sm} in {colors.text-subtle}; figures in {typography.numeric}"
  data-table:
    base: "{components.data-table}"
    header:
      surface: "{colors.bg-subtle}"
      type: "{typography.table-header}"
      sort: "affordance hidden until column hover; active column shows an {colors.accent} arrow"
    row:
      divider: "{components.separator}"
      hover: "{colors.accent-bg} tint"
      parts:
        identity: "28px alternating avatar ({components.avatar}) + name in {colors.text}"
        meta: "email / company in {colors.text-muted}, truncate with ellipsis (never wrap)"
        entry: "{components.tag}  (Self Sign-Up / Invited)"
        status: "{components.status} with dot per state (success / warning / error)"
        numeric: "rate, referrals, money — left-aligned, {typography.numeric}"
        money: "commission emphasized in {colors.success}; empty = '—' in {colors.text-subtle}"
    row-rejected: "muted row; status dot {colors.error}; hidden unless 'Show rejected' is on"
  table-footer:
    structure: "result summary (left) + per-page select + pager (right)"
    parts:
      summary: "{typography.body-sm} in {colors.text-subtle}; numbers in {typography.numeric}"
      per-page: "{components.select}"
      pager: "{components.pagination}  (icon buttons; disabled buttons dimmed)"
  auth-login:                          # the admin + partner login screens (AuthSplitShell)
    structure: "two columns: left = form, right (≥lg only) = decorative panel"
    left:
      surface: "{colors.bg} (manila) + faint warm dotted-paper grid (radial dots, 22px)"
      content: "BrandMark (top-left) → centered heading block (eyebrow + display title in deepGreen + subtitle) → form (boxed inputs) → full-width primary button (h-12, rounded-lg)"
    right:
      panel: "rounded-3xl on {colors.accent-bg}, with two heavily blurred (blur-3xl) roaming brand-teal radial blobs in an over-bleed -inset-1/4 wrapper (no hard edges)"
      scene: "a floating product story in glassmorphism cards (bg-white/40, backdrop-blur-md, border-white/50) — Commission earned / closed Referral / Payout sent — plus a typewriter tagline ('Turn referrals into revenue') + subtitle"
    deepGreen: "#00342E"               # login display headings (darker than {colors.accent})
    animations: "drift (blobs roam + scale, wide travel), float (card bob, staggered), caret-blink (typewriter) — @keyframes in globals.css"
    note: "Login + landing (partner-first) + admin forgot-password use AuthSplitShell; password-reset still uses the lighter AuthShell. Gradients use blurred blobs, never animated background-position (which seams)."
---

## Overview

Clara Central should feel like a ledger someone keeps with care: ordered,
warm, and quiet. The page is a soft manila off-white; white cards lift off
it with a faint warm shadow. Attention lands on the numbers — the four
metric cards and the money in the table — and on the one green action.
Everything else (labels, borders, metadata) recedes so the data leads.

## Colors

- **Surfaces (bg / sidebar / card / subtle / input):** A near-monochrome
  warm-white family. The page is `bg` (#FFFDF9); cards, sidebar, and inputs
  are white and separate from the page through shadow and the single
  border, not through a darker tint. `bg-subtle` is the barely-there strip
  behind table headers. `bg-hover` (#F7F5F3) is the only "pressed" warm
  gray, used for the active nav item and ghost buttons.
- **border:** One value, `#EFEDE9`, for every divider, outline, input edge,
  and status-pill stroke. Warm and low-contrast — it defines edges without
  drawing the eye.
- **Text (text / muted / subtle):** A three-step ink hierarchy, plus
  `text-inverse` for labels on the accent and dark surfaces.
- **accent (#00685B):** The deep accounting green. Reserved for action —
  buttons, links, focus, selected states. `accent-strong` is its
  hover/pressed darken; `accent-bg` is the soft tint for selected rows.
- **brand (#865F11):** A muted gold for *identity*, not action — the
  wordmark, the active-nav label, and gold avatar monograms. Brand and
  action stay on separate jobs; never use gold for buttons or green for
  the wordmark.

### Semantic colors

Status and feedback hues are deliberately desaturated to live in the warm
register — no Bootstrap brights, no cold blues. The accounting metaphor
drives the pairing: green is *in the black*, red is *in the red*.

- **success = green (#009F69)** — "Approved". Surface tint `success-bg`.
- **warning = muted amber (#8F5A0C)** — "Pending" and caution. The amber is
  pushed slightly more orange than brand gold so the two don't read as the
  same color in a status context. Surface tint `warning-bg`.
- **error = brick red (#BE3219)** — "Rejected" and destructive actions.
  Surface tint `error-bg`.

There is intentionally **no `info` / blue token** in the core feedback set —
a cold hue would break the palette. If an informational state is ever needed,
use the neutral ink hierarchy or `accent`.

**Exception — the referral pipeline.** A six-stage sales funnel needs more
separation than the warm set provides, so `referralStatusMeta` uses an
**extended, distinct-hue palette** (kept muted): `slate` → Submitted,
`teal` → Contacted, `violet` → Meeting Scheduled, `warning` (amber) →
Proposal Sent, `terracotta` → Negotiating, `success` (green) → Deal Closed;
`neutral` → No Response, `mauve` → Not Qualified, `error` → Lost. This
deliberately relaxes the "no cold hues" rule **only for pipeline stages** so
each is recognizable at a glance and the funnel reads as it advances. These
tones live in the `StatusBadge` color/icon maps (`StatusTone`); the warm
`success` / `warning` / `error` / `neutral` set still covers partner, invoice,
and contract statuses.

`focus-ring` is accent at 30% for keyboard focus; `scrim` is a warm-black
backdrop for overlays. This screen is light-mode only; a dark theme would
override the same token names. No values are bound to Figma variables yet —
this file is the first definition of the system.

## Typography

Two families, each with a clear job. **Fraunces** (a soft, bookish serif)
appears only at the top of the hierarchy — wordmark, page title, section
headings — giving the product its "Books" character. **IBM Plex Sans** does
everything else: body, labels, table data, buttons.

**Numbers are tabular.** `metric` (stat figures) and `numeric` (money and
numeric table columns) both set `tabular-nums` so decimals align down a
column — the right behavior for a finance product and the thing that makes
the money read like a statement rather than prose.

## Layout

- **Shell:** fixed-width sidebar (≈248–290px) + fluid main content.
- **Page gutter:** `{spacing.xxl}` (32px) on desktop.
- **Vertical rhythm:** `{spacing.xl}` (24px) between major sections
  (header → stats → toolbar → table); `{spacing.lg}` (16px) between cards.
- **Sidebar:** same light family as the canvas, separated by a border and
  a soft shadow rather than a different color.

## Shapes

- `{rounded.sm}` (4px) — checkboxes, entry tags.
- `{rounded.md}` (6px) — buttons, inputs, search, nav items, pagination.
  (Clara runs 6px controls, not the more common 8px.)
- `{rounded.lg}` (12px) — cards and the table container. **Every card surface
  uses 12px** (base `Card`, `KpiCard`, marketing `MaterialCard`, etc.). In
  Tailwind classes this is **`rounded-xl`** (0.75rem = 12px) — *not* `rounded-lg`,
  which is 8px. Use `rounded-xl` for any new card.
- `{rounded.pill}` — status pills and avatars, where the round form
  carries meaning.

## Elevation

Because cards are white on a warm-white page, surface contrast alone can't
separate them — so Clara uses one soft, **warm** shadow. The **card shadow**
(every `Card` and `KpiCard`) is `0 4px 24px -6px rgba(168,163,148,0.35)` — a
lifted, directional warm shadow; the sidebar keeps the flatter ambient
`0 0 20px rgba(168,163,148,0.15)`, and menus/dialogs use a slightly deeper warm
shadow. A **clickable** card (one with an `href`) lifts on hover:
`-translate-y-0.5` + `0 12px 32px -8px rgba(168,163,148,0.5)`. **Border rule:**
the single hairline border is reserved for the **table container** — every
other surface (cards, sidebar, stat cards) separates by shadow alone, never a
border. Never mix in cool/black shadows; that temperature clash was an earlier
defect.

## Components

Conventions specific to Clara:

- **Action:** the primary button is solid `accent`; the row-level **View**
  is a `button-ghost` (warm-gray fill, gold-brown label); destructive
  actions use `button-destructive` (brick fill). The **Approve** action is
  its own variant, `button-approve`, and **always** uses the success green
  (`#009F69` / `{colors.success}`) — never the `accent` green — so the
  positive/confirm action reads as distinct from a generic primary.
  **Capitalization:** every button label is **Title Case — all words
  capitalized** (e.g. "Add Invoice", "Record Payment", "Mark Contract
  Ended", "Send Invitation", "Save Changes"), never sentence case.
- **Dialog action:** the primary action *inside a dialog/overlay* uses
  `button-dialog-primary` — solid **ink black** (`#0A0A0A` / `{colors.text}`),
  not the `accent` green. Green is reserved for the in-page primary; inside
  an overlay the dark button reads calmer against the white modal. Cancel
  stays secondary/outline; destructive and Approve keep their own variants.
- **Dialog sizing:** a dialog never exceeds **88% of the viewport height**
  (`max-h-[88vh]`); when its content is taller, the **body scrolls vertically**
  while the **footer stays pinned** (sticky) to the bottom so the action
  buttons are always reachable. Applies to every dialog via `DialogContent` /
  `DialogFooter`. **Width:** every create/edit **form** dialog uses
  `sm:max-w-lg` (512px) — the standard; the media-preview dialog is `max-w-4xl`
  and minimal confirms are `sm`/`md`. Don't widen a form past `lg`.
- **Dialog scroll structure:** `DialogContent` is split into a non-scrolling
  **outer shell** (carries the centering transform, rounding, shadow, and a
  stationary `bg-card` backstop) wrapping an **inner scroll region**. Sticky
  header/footer pin against the *untransformed* inner scroller — so they never
  jitter and no gap can expose the dark overlay. The page rubber-band is killed
  globally (`overscroll-behavior: none` on `html, body`) so a `position: fixed`
  dialog can't ride the document bounce at the scroll extremes.
- **Form:** all controls share a *white* surface with the single border —
  search is **not** a pill here. Focus draws `input-focus` (accent border +
  `focus-ring`). Selected checkbox/switch state uses `accent`. **Every input
  and textarea carries a `placeholder`** — a short example of the expected
  value (e.g. `name@example.com`, `e.g. Cedar & Pine Cafe`, `(555) 000-0000`),
  never a restatement of the label. The only exceptions are read-only/disabled
  fields and `type="file"`/`type="number"` controls where an example adds
  nothing.
- **Navigation:** items are transparent and muted at rest; the active item
  fills with `bg-hover` and switches its label to **brand gold**, bold.
- **Feedback → status:** one tinted pill — a soft semantic fill (`*-bg`) with
  the matching semantic color carrying both the label and a tone icon
  (check / clock / x / minus); no border, no dot. **Placement is a rule:** in
  any detail/record window the status pill **always sits at the header level,
  inline next to the entity title** (e.g. `Liam Walsh  ● Approved`) — never
  buried in the body. This filled pill is reserved for the **primary** status
  (e.g. Referral Status). A **secondary** status (e.g. the commission-window
  Contract Status) uses the quieter `contract-status` treatment — an outlined
  pill (thin border, **no fill**) with a colored dot + muted label — so it
  reads as supporting, not competing with the primary pill. **Capitalization:**
  every status label uses **Title Case — all words capitalized** (e.g.
  "Meeting Scheduled", "Deal Closed", "Contract Ended", "No Response"), never
  sentence case. **alert** has neutral plus three semantic variants that fill
  with the matching `*-bg` tint.
- **Data Display → avatar:** 28px monogram that **alternates** tint by row
  position — gold then teal. Decorative rhythm, tied to row index, not to
  the person. **badge** is the only solid-accent chip (counts/emphasis);
  **tag** (Entry marker) is the quietest element: transparent, muted.
- **Layout → card / table:** white surfaces; the card lifts via shadow, the
  table defines itself with the border and a `bg-subtle` header strip.

Variants follow a suffix convention (`button-hover`, `toggle-active`,
`navigation-menu-active`, `status-pending`, `alert-error`) so they resolve
by name.

## Patterns

The `patterns:` block above documents the recurring *assemblies* on the
screen — the things you'd otherwise rebuild from scratch each time. The
rule of thumb: if it's a single part, it's a component; if it composes
parts in a fixed way, it's a pattern. The six patterns derived from the
Partners screen are **app-sidebar**, **page-header**, **stat-card**,
**toolbar**, **data-table**, and **table-footer**; **auth-login** documents
the two-column login frame. Each names its parts as
references to components/tokens, so the patterns stay in sync when a base
value changes. Add a pattern only when a composition is reused; one-off
layouts don't belong here.

## States

Interactive primitives resolve their states by token. Where a cell is "—",
the element has no meaningful version of that state.

| Element | Default | Hover | Focus | Active / Selected | Disabled |
|---|---|---|---|---|---|
| button (primary) | `accent` fill | `accent-strong` | + `focus-ring` | `accent-strong` (pressed) | `bg-hover` / `text-disabled` |
| button-ghost | `bg-hover` / gold label | surface darkens | + `focus-ring` | — | dim label |
| button-destructive | `error` fill | `error` darken | + `focus-ring` | — | `bg-hover` / `text-disabled` |
| button-approve | `success` fill (#009F69) | `success-strong` | + `focus-ring` | — | `bg-hover` / `text-disabled` |
| input / search | white + `border` | `border` darkens | `accent` border + `focus-ring` | — | `bg-hover` / `text-disabled` |
| checkbox | `border` only | `border` darkens | + `focus-ring` | `accent` fill + inverse check | dim |
| nav item | transparent / `text-muted` | `bg-hover` | + `focus-ring` | `bg-hover` + `brand`, bold | — |
| link | `accent` | `accent-strong`, underline | + `focus-ring` | — | `text-disabled` |
| table row | transparent | `accent-bg` tint | — | — | — |
| sort header | icon hidden | icon ~55% opacity | — | `accent` arrow | — |
| pagination button | `text` / `border` | `bg-hover` | + `focus-ring` | current page bold | `text-subtle`, no pointer |

Status is not in this table: its "states" are semantic (success / warning /
error dot color), not interaction states.

## Auth & login

The login (admin + partner) and landing (portal-selection) screens use a
**two-column** frame, `AuthSplitShell`:

- **Left — form column.** A manila canvas with a faint **dotted-paper** grid
  behind it (`radial-gradient` dots, 22px). `BrandMark` top-left, then a
  **centered** heading block (eyebrow → display title in deep green `#00342E`
  → subtitle), the form (boxed inputs), and a full-width primary button
  (`h-12`, `rounded-lg`). A "← Back to home" link sits below.
- **Right — decorative panel (≥`lg` only).** A `rounded-3xl` panel on a soft
  light-green ground (`accent-bg` / `#ECF4EC`) carrying two **heavily blurred,
  slowly roaming brand-teal "blobs"** (`radial-gradient` circles, `blur-3xl`,
  in an over-bleed `-inset-1/4` wrapper so no hard edge ever shows). Over them
  sits a **floating product scene** — **glassmorphism** cards (`bg-white/40`,
  `backdrop-blur-md`, hairline `border-white/50`) telling the referral →
  commission → payout story — plus a **typewriter tagline** ("Turn referrals
  into revenue") with a subtitle. Animations are pure CSS: `@keyframes drift`
  (the roaming blobs — wide travel + scale), `float` (the cards),
  `caret-blink` (globals.css). Keep them gentle; this is ambient, not loud.
  When changing the gradient, use a blurred-blob layer (not an animated
  `background-position`, which seams) so edges stay soft.
- Password-reset still uses the lighter, single-column `AuthShell`; the
  landing now shares this two-column frame.

## Cards, covers & uploads

Conventions for content cards and file artifacts (marketing library, etc.):

- **Content card (Arcade-style):** a `rounded-xl` card (12px), `p-3`, the
  standard lifted card shadow with a hover lift. A **framed thumbnail** sits at
  the top — its own `rounded-xl`, fixed `16:10` ratio, `overflow-hidden`, with a
  gentle `group-hover:scale-105` zoom. Below: a bold **18px** title
  (`font-semibold`), an optional clamped description, then a footer that pairs a
  **passive type-icon chip** on the left with the actions on the right. The chip
  is deliberately **muted** (`bg-muted` / `text-muted-foreground`), never the
  accent tint — an accent-filled chip reads as a button.
- **File-type covers** (`FileTypeThumb`): non-image files show a cover on a soft
  neutral ground (`#F4F4F2`). Known types render a PNG glyph from
  `/public` (`PDF.png`, `DOC.png`, `PPTX.png`, `XLSX.png`, `ZIP.png`,
  `IMAGE.png`, `LINK.png`); unknown types fall back to an inline SVG document
  glyph with a per-type colored band — **PDF** red, **DOC/DOCX** blue,
  **PPT/PPTX** orange, **XLSX** green, **ZIP** gray, **IMAGE** green, **LINK**
  teal. A real `thumbnailUrl` image always wins over the glyph. Default
  `rounded-md`; the radius is overridable (a full-bleed cover passes
  `rounded-none` and is clipped by its `rounded-xl` frame).
- **File upload** (`FileDropField`): a **single file slot**. Empty → a dashed
  dropzone ("**Click to upload** or drag and drop"). Once a file exists (newly
  picked, or the existing one in a replace flow) it shows **one** chip — icon +
  type badge + name (+ size for a new pick) — with Replace / View / clear.
  Picking a new file **replaces in place** — never show the old and new file at
  once. Both click and drag-drop work, on the dropzone and on the chip.
- **Clamped rich text** (`ClampedDescription`): a card description collapses to
  its **first row** (first wrapped line for prose, first item for a list),
  clipped to one line-height. A **Show More** link sits below it and only
  appears when the content actually overflows; expanded offers **Show Less**.
  (Both labels are Title Case, per the button rule.)
- **Categorical encoding (table columns):** a **primary** categorical column
  (e.g. Activity-log *Action*) uses a soft **tinted pill + leading icon**, one
  hue family per meaning — green/teal for create & money-positive, brick for
  destructive, gold/amber for edits & state changes, sage/stone for sessions —
  all warm, **no cold/blue**. A **secondary** categorical column (e.g. *Entity*)
  drops the chrome: a leading icon + plain label, so it reads as supporting.

## Gotchas

Hard-won fixes worth not relearning:

- **Input font size:** the base `Input` ships `md:text-sm`, so a bare
  `text-xl` is overridden to 14px on ≥`md`. To resize a field, set the `md:`
  variant too (`text-xl md:text-xl`).
- **Autofill tint:** Chrome/Safari repaint prefilled fields blue/yellow via
  `:-webkit-autofill`. A global override in `globals.css` (box-shadow inset +
  `-webkit-text-fill-color`, `!important`) restores the card surface + ink.
- **CardHeader is a grid:** `CardHeader` is `display: grid` by default —
  `flex-row` alone won't lay its children in a row (it only sets
  `flex-direction`). Use `flex` to actually switch to flexbox, and push the
  `CardAction` right with `ml-auto` (the grid's `justify-self-end` is inert in
  flex).

## Number & content formatting

A finance product lives or dies on legible figures, so formatting is part
of the system, not an afterthought.

- **Currency:** `$` prefix, always two decimals, thousands grouped, tabular —
  `$2,050.00`. Set in `{typography.numeric}`.
- **Percentages:** integer + `%`, tabular — `10%`.
- **Counts:** integers, tabular.
- **Empty vs. zero:** a true zero shows `0` / `$0.00` in `{colors.text}` (it's
  data); a genuinely absent value shows an em dash `—` in
  `{colors.text-subtle}`. Don't render absence as `$0.00`.
- **Truncation:** long names, emails, and company strings truncate with an
  ellipsis at the cell edge and never wrap.
- **Alignment:** **every table cell is left-aligned** — text, numeric, money,
  percentage, and counts alike. (Tabular figures keep decimals tidy without
  needing right-alignment.) Only the row-actions column stays right-aligned,
  since its buttons are controls, not content.
- **Dates** (Joined / Last login columns): *recommended* convention — a
  compact absolute format (`Mar 3, 2025`), optionally relative for very
  recent activity (`2h ago`). Flagged as recommended; the exact format isn't
  pinned in the current frame.

## Notes on generated values

These were extrapolated from the established palette to complete the system
(no source on the Partners screen), all kept within the warm, muted range:
the semantic `warning` / `error` colors and their tints, `accent-strong`
(hover), `success-strong`, `accent-bg`, `text-inverse`, `focus-ring`, `scrim`, the deeper
`popover` shadow, and the `numeric` tabular type style. Adjust any of these
freely — they reference tokens, so changing a value cascades to every
component that uses it.
