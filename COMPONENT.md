# COMPONENT.md

> Catalog of every UI component shipped with this project. **Update this file in the same commit that adds, renames, or removes a component, or adds a new variant.**
>
> Companion docs: [DESIGN.md](./DESIGN.md) (design tokens, patterns) · [CODEMAP.md](./CODEMAP.md) (where to add what)

**Component categories:**



| Folder | Source | Edit policy |
|--------|--------|-------------|
| `src/components/ui/` | shadcn/ui primitives | Do not edit — re-add via `shadcn` CLI if needed |
| `src/components/reui/` | ReUI components | Do not edit — re-add via `shadcn@latest add @reui/<name>` |
| `src/components/custom/` | Generic app building blocks | Free to edit |
| `src/components/layout/` | App chrome (header, sidebar) | Free to edit |
| `src/components/data-table/` | DataTable composition | Free to edit |

Each entry: short purpose · variants (if any) · `.stories.tsx` reference (if present).

---

## `src/components/ui/` — shadcn/ui primitives

### AlertDialog — `ui/alert-dialog.tsx`
Modal dialog for destructive/critical confirmations. Two-button (confirm/cancel).

### Avatar — `ui/avatar.tsx`
Round image avatar with fallback initial. Use `<UserAvatar>` (custom) for app users — wraps this.

### Badge — `ui/badge.tsx`
Status pill. Variants: `default | secondary | destructive | outline`. Story: `ui/badge.stories.tsx`

### Button — `ui/button.tsx`
Standard interactive button.
- Variants: `default | destructive | success | outline | secondary | ghost | link` (`success` = green Approve / positive-confirm action, distinct from primary)
- Sizes: `default | sm | lg | icon`
- Story: `ui/button.stories.tsx`

### ButtonGroup — `ui/button-group.tsx`
Visually-joined row of buttons sharing borders.

### Calendar — `ui/calendar.tsx`
Date picker calendar. Built on `react-day-picker`. Embedded inside Popover for inputs.

### Card — `ui/card.tsx`
Container with subtle border + radius. Sub-parts: `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`. Story: `ui/card.stories.tsx`
- **Gotcha:** `CardHeader` is `display: grid` by default. To lay its children in one row, pass `flex` (NOT `flex-row` — that only sets `flex-direction` and leaves `display: grid`), and push a `CardAction` right with `ml-auto` (the grid's `justify-self-end` is inert under flex).

### Checkbox — `ui/checkbox.tsx`
Binary checkbox. Pairs with `<Label>`. Story: `ui/checkbox.stories.tsx`

### Collapsible — `ui/collapsible.tsx`
Show/hide content under a trigger.

### Command — `ui/command.tsx`
Command palette UI (cmdk). Used for searchable lists and quick actions.

### Dialog — `ui/dialog.tsx`
Modal dialog for confirmations and short interactions.
- **Use for**: confirmations, short forms.
- **Don't use for**: side panels (use `<Sheet>` instead).
- **Structure**: `DialogContent` = a non-scrolling outer shell (transform/rounding/shadow + stationary `bg-card` backstop) wrapping an inner `[data-slot="dialog-scroll"]` region (`overflow-y-auto overscroll-contain`). `DialogHeader`/`DialogFooter` are `sticky` against the inner scroller — keeps them from drifting and prevents the overlay showing through. Page rubber-band is disabled globally so the fixed dialog never jolts at scroll extremes.
- **Width**: form create/edit dialogs use `sm:max-w-lg`; media preview `max-w-4xl`; tiny confirms `sm`/`md`.
- Story: `ui/dialog.stories.tsx`

### DropdownMenu — `ui/dropdown-menu.tsx`
Dropdown menu with items, separators, sub-menus, checkboxes. Story: `ui/dropdown-menu.stories.tsx`
- `DropdownMenuCheckboxItem` takes `showIndicator?: boolean` (default `true`); set `false` to drop the built-in left checkmark and supply your own selection control (e.g. a `Checkbox`).

### Form — `ui/form.tsx`
React Hook Form integration. Wraps fields with `<FormField>`, `<FormItem>`, `<FormLabel>`, `<FormControl>`, `<FormMessage>`. Story: `ui/form.stories.tsx`

### Input — `ui/input.tsx`
Standard text input.
- **Font-size gotcha**: ships `md:text-sm`, so a bare `text-*` override reverts to 14px on ≥`md`. Resize with the `md:` variant too (e.g. `text-xl md:text-xl`).
- **Autofill**: browser autofill tint (Chrome blue / Safari yellow) is neutralized globally via `:-webkit-autofill` in `globals.css`, so prefilled fields keep the card surface + ink.

### InputGroup — `ui/input-group.tsx`
Input with leading/trailing addons (icons, prefixes).

### InputOTP — `ui/input-otp.tsx`
Segmented one-time-code entry (built on `input-otp`). Compose `<InputOTP>` with `<InputOTPGroup>`, `<InputOTPSlot index={n} />`, and `<InputOTPSeparator>`. Used in the partner login OTP step. Backed by the `input-otp` package; caret blink relies on the `animate-caret-blink` utility from `tw-animate-css`.

### Kbd — `ui/kbd.tsx`
Keyboard shortcut chip — for showing key combos in tooltips/menus.

### Label — `ui/label.tsx`
Accessible form label. Always pair with form inputs.

### Popover — `ui/popover.tsx`
Floating panel anchored to a trigger. Used for date pickers, color pickers, info panels.

### ScrollArea — `ui/scroll-area.tsx`
Custom scrollable container with styled scrollbars.

### Select — `ui/select.tsx`
Dropdown select with keyboard navigation.

### Separator — `ui/separator.tsx`
Horizontal or vertical divider line.

### Sheet — `ui/sheet.tsx`
**Side panel** sliding from edge (top/right/bottom/left).
- **Use for**: side panels, slide-out forms, navigation drawers.
- **Don't use for**: confirmations (use `<Dialog>`).

### Sidebar — `ui/sidebar.tsx`
Sidebar primitive with collapsible state. Currently unused — a role-nav sidebar returns with the feature pages.

### Skeleton — `ui/skeleton.tsx`
Loading placeholder bars/blocks.

### Sonner — `ui/sonner.tsx`
Toast notification provider (wraps `sonner` library). Mount once at root.

### Spinner — `ui/spinner.tsx`
Loading indicator. Use inside buttons during async, or as page-level loader.

### Switch — `ui/switch.tsx`
Toggle on/off control. Pair with `<Label>`.

### Table — `ui/table.tsx`
Basic semantic table primitives (`Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`). For data tables with sorting/visibility, use `<DataTable>` (data-table/).

### Tabs — `ui/tabs.tsx`
Tab list and panels. Standard pattern for setting groupings.

### Textarea — `ui/textarea.tsx`
Multi-line text input.

### Tooltip — `ui/tooltip.tsx`
Hover/focus tooltip. Requires `<TooltipProvider>` at root (mounted in app layout).

---

## `src/components/reui/` — ReUI components

### Alert — `reui/alert.tsx`
Inline alert banner with icon. Variants for info/warning/error/success. Story: `reui/alert.stories.tsx`

### Autocomplete — `reui/autocomplete.tsx`
Combobox with async/filterable suggestions.

### Badge — `reui/badge.tsx`
Extended badge with more variants and dot indicators. Story: `reui/badge.stories.tsx`

### DateSelector — `reui/date-selector.tsx`
Date and date-range picker UI.

### Filters — `reui/filters.tsx`
Filter bar with chips for table/list filtering.

### Stepper — `reui/stepper.tsx`
Multi-step process indicator (e.g., wizards, onboarding flows).

### Timeline — `reui/timeline.tsx`
Vertical timeline for activity log, events, history. Story: `reui/timeline.stories.tsx`

### DataGrid — `reui/data-grid/data-grid.tsx`
Full-featured data grid (TanStack Table-backed) with sub-components for advanced use cases:

- `data-grid-column-filter.tsx` — per-column filter inputs
- `data-grid-column-header.tsx` — sortable/draggable header cells
- `data-grid-column-visibility.tsx` — show/hide columns
- `data-grid-pagination.tsx` — page-size + page-number controls
- `data-grid-scroll-area.tsx` — virtualized scroll container
- `data-grid-table.tsx` — base table renderer
- `data-grid-table-dnd.tsx` — drag-and-drop rows
- `data-grid-table-dnd-rows.tsx` — DnD row internals
- `data-grid-table-virtual.tsx` — virtualized table renderer

**When to use DataGrid vs DataTable**: DataGrid for power-user tables (DnD, virtual scroll, complex filters). DataTable for standard CRUD lists.

---

## `src/components/custom/` — generic app components

### ChangeEmailDialog — `custom/change-email-dialog.tsx`
Two-step "change my email" flow shared by the admin and partner profile pages: step 1 enters a new email (current shown read-only) → step 2 confirms with a 6-digit `InputOTP` code, mirroring the login OTP screen. Trigger is a `variant="outline" size="sm"` "Change email" button; the panel uses `DialogHeader`/`DialogFooter` for structure. Backed by role-aware `requestEmailChangeAction`/`verifyEmailChangeAction`; the code is mocked (any 6 digits) until email delivery is enabled (`NEXT_PUBLIC_PARTNER_OTP_EMAIL`). Props: `currentEmail`, `disabled?` (inert trigger — passed as `profile.isDemo` so demo sandboxes can't change their login identity; the actions refuse it server-side too). On success toasts, invalidates `queryKeys.myProfile`, and `router.refresh()`.

### CheckboxListField — `custom/checkbox-list-field.tsx`
Form field that renders a list of checkboxes (e.g., multi-select permissions). React Hook Form integrated. Story: `custom/checkbox-list-field.stories.tsx`

### ClampedDescription — `custom/clamped-description.tsx`
Rich-text description shown collapsed to its first row (first wrapped line for text, first item for a list) with a bold green "…" that expands the full content in place; expanded view offers "Show less". The "…" appears only when the content overflows one line. Shared by the partner marketing cards (`MaterialCard`) and the admin marketing rows (`MaterialItem`) so both clamp identically. Optional `className` merges onto the wrapper.

### CoverImageField — `custom/cover-image-field.tsx`
Cover-image picker for a marketing item (link or file) that mirrors exactly what the card will show. The 16:10 preview resolves in the same order as the card: newly-picked file (object URL) → resolved `currentUrl` (an explicit cover, or the file's own raster image) → the `placeholder` node (the `FileTypeThumb` type box); only with none of those does it fall back to an empty dropzone. **Replace** and **Remove cover** are overlaid on the image itself (top-right translucent chips); `removable` controls whether Remove shows (an explicit cover, or a file's own auto image that can be suppressed to the placeholder). Presentational — the parent owns validation/state via `file`/`onSelect(file | null)`/`onRemove`/`currentUrl`/`placeholder`/`removable`. Restricted to raster images (PNG/JPG, ≤5 MB) via `ACCEPT_COVER_ATTR`. Used by the marketing create/edit item dialogs; edit forms share a `useCoverEditState` hook that persists via `useSetItemCover`.

### DatePicker — `custom/date-picker.tsx`
Themed single-date picker: shadcn `Calendar` in a `Popover` behind a full-width `Button` trigger (clicking anywhere on it opens the calendar — not just an icon). Controlled, string-in/out (`YYYY-MM-DD`), and **timezone-safe** via `parseLocalDate`/`formatLocalDate` (never `toISOString`). Works inside a `<FormControl>` (forwards ref + id/aria to the trigger via `forwardRef`) or with plain `useState` — pass `value`/`onChange`, not `{...field}`. Supports `min`/`max` (exclusive matchers, so `max=today` keeps today selectable), `clearable`, and `withDropdownNav` (month+year dropdowns, default on). This is the standard date input — prefer it over native `<input type="date">`. Story: `custom/date-picker.stories.tsx`

### DetailRow — `custom/detail-row.tsx`
Label-value pair for detail panels (label on left, value on right). Used in user profiles, settings detail sheets. Story: `custom/detail-row.stories.tsx`

### FileDropField — `custom/file-drop-field.tsx`
Styled file picker with a **single file slot**. Empty → a click-or-drag dropzone (dashed border, upload-cloud icon, "Click to upload or drag and drop"). Once a file exists (a newly picked one, or the existing `currentFileName` in replace flows) it shows one chip — icon + type badge + name (+ size for a new pick) — with **Replace** and (for the current file, via `onViewCurrent`) **View** actions; picking a new file replaces the current one in place (never two files at once), and the clear "✕" reverts to the current. Presentational — the parent owns validation and the selected `File` state, wired via `onSelect(file | null)`. Used by the marketing create/edit item dialogs (edit wires `onViewCurrent` to `MarketingPreviewDialog`).

### FileTypeThumb — `custom/file-type-thumb.tsx`
Presentational cover thumbnail for non-image marketing files (and the image fallback). Known types render a PNG glyph from `/public` (`PDF.png`, `DOC.png` [also DOCX], `PPTX.png` [also PPT], `XLSX.png`, `ZIP.png`, `IMAGE.png`, `LINK.png`) on a soft neutral background (`#F4F4F2`); the `IMAGE_GLYPH` map controls the type→file routing. Unknown types fall back to an inline SVG document glyph with a per-type colored band from `TYPE_COLOR` (`DEFAULT_COLOR` gray otherwise), labelled with the badge `type` at a font size stepped down for 4- and 5-character labels. Scales to its container via `className` (twMerge) — partner cards fill `h-full`, admin rows pass a compact `size-12`. Shared by the partner library cards and the admin authoring rows.

### GradientProgressBar — `custom/gradient-progress-bar.tsx`
Progress bar with brand gradient fill. For onboarding, upgrade progress, etc. Story: `custom/gradient-progress-bar.stories.tsx`

### KpiCard — `custom/kpi-card.tsx`
At-a-glance metric card: title + value + optional delta/trend. Tabular numerals. Story: `custom/kpi-card.stories.tsx`

### MarketingPreviewDialog — `custom/marketing-preview-dialog.tsx`
In-app preview of a marketing file — raster image (`<img>`) or PDF (`<iframe>`) — via an on-demand inline signed URL (`fetchMarketingPreviewUrl`, never cached), with a Download action. The media area is a fixed `h-[70vh]` viewport (skeleton fills it, image is `object-contain`-centered inside it, PDF iframe fills it) so the popup keeps one size across loading→loaded and regardless of image aspect ratio — no reflow. Open whenever the `item` prop (`{ id, name, fileName }`) is non-null; closing clears it via `onOpenChange`. Shared by the admin Marketing authoring page (clickable row thumbnail / name / Eye button) and the partner read-only library ("View" thumbnail). Gate the trigger on `canPreviewInline(fileName)` (the `previewable` flag on enriched items) — only png/jpg/jpeg/pdf qualify.

### OnboardingForm — `custom/onboarding-form.tsx`
Shared partner onboarding form (RHF + zod `applyToJoinSchema`), used by two routes via `mode`:
- `invite` — `/invite/[token]`: email + "how did you hear" locked/prefilled; submit → `completeOnboardingAction` (auto-approve + auto-login).
- `apply` — `/apply`: email + "how did you hear" editable; submit → `applyToJoinAction` (creates a pending application), then calls `onApplied`.
Renders inside a `Card`; expects an `AuthShell` wrapper from the page.

### PageHeader — `custom/page-header.tsx`
Page-level header with title, description, and right-side action slot. Use at top of every `(platform)` page. `subtitle` accepts `ReactNode` (not just a string), so it can carry rich content like a bolded commission rate (used by the partner My Referrals header). **Status rule:** on a detail/record window, render the record's `StatusBadge` at this header level, inline (≈10px gap) to the right of the title — never inside the page body. Story: `custom/page-header.stories.tsx`

### Page skeletons — `custom/page-skeletons.tsx`
Composable, server-renderable skeleton blocks for route `loading.tsx` Suspense fallbacks, each mirroring a real page region: `PageHeaderSkeleton`, `KpiGridSkeleton({count})`, `ToolbarSkeleton`, `TableSkeleton({rows,columns})`, `DetailHeaderSkeleton`, `InfoCardSkeleton({fields})`, `FormCardSkeleton({fields})`. Built from `ui/skeleton` + `ui/card` + `ui/table`. Compose them per route to match the page shape (list = header + KPIs + toolbar + table; detail = header + info card + table; settings = header + form card).

### RichTextEditor — `custom/rich-text-editor.tsx`
Headless Tiptap WYSIWYG for HTML descriptions: bold / italic / bullet + ordered lists / links. Controlled `value` / `onChange` / `placeholder`. Enabled nodes/marks are kept in lockstep with the server-side sanitizer (`src/lib/sanitize.ts`). Also exports **`RichTextDisplay`** — renders already-sanitized description HTML (`dangerouslySetInnerHTML`). Used by the admin Marketing item dialogs + rows.

### TypingWord — `custom/typing-word.tsx`
Client-only decorative typewriter: types a `word` out, holds, erases, repeats, with a blinking caret (`@keyframes caret-blink`). Used in the login decorative panel (`AuthSplitShell`). Props: `word`, `className`.

### StatusBadge — `custom/status-badge.tsx`
Tinted pill: a soft semantic background fill with the matching semantic color carrying both the label and a tone icon (check / clock / x / minus) — no border, no dot. Prop-driven: `label` + `tone`. Tones: the warm semantic set (`success | warning | info | destructive | neutral`) plus the extended referral-pipeline hues (`slate | teal | violet | terracotta | mauve`), each with its own tint + icon. Map a domain enum to `{ label, tone }` via `src/lib/status-meta.ts` (`partnerStatusMeta`, `referralStatusMeta`). Used in the partners/referrals list + detail tables. Pass `onRemove` (+ optional `removeLabel`) to render a dismissible filter chip — an on-tone trailing × button — used for the active status filters on the referrals list. **Placement rule:** a record's status pill ALWAYS sits at the header level, inline next to the entity title in detail views (see PageHeader) — never in the body. For the **primary** (Referral) status only — secondary statuses use ContractStatus.

### ContractStatus — `custom/contract-status.tsx`
Quiet, **secondary** status. A thin border (**no fill**) wraps only the status **name** (colored dot + muted label); the optional `detail` (e.g. a date) sits **outside** the pill, muted. Same `tone` set as StatusBadge. Used for the commission-window / **Contract Status**, intentionally lighter than the main filled-pill StatusBadge. Props: `label`, `tone`, `detail?`.

### UserAvatar — `custom/user-avatar.tsx`
Round user avatar built on the Radix `Avatar` primitive. Props: `initials` (fallback monogram), `size` (`sm | md | lg`), `tint` (`gold | teal` — alternates per table row), and optional `imageUrl` (a profile picture; falls back to the tinted initials monogram if absent or it fails to load). Used in the admin partners list/detail, the partner profile picker, and the header user menu. Story: `custom/user-avatar.stories.tsx`

### TimeRangeSelect — `custom/time-range-select.tsx`
The list-toolbar time filter: a **controlled** `Select` offering Any time / Last 7 / 30 / 90 days. Props: `value` + `onChange` (a `TimeRange` from `src/lib/utils.ts`), `ariaLabel` (say which date it narrows, e.g. "Filter payouts by payment date"), `className`. Always pair it with `withinTimeRange(isoDate, range)` in the page's filter memo — that helper counts calendar days in the **viewer's** timezone, inclusive of today, and never hides future-dated rows. Use this instead of hand-rolling the four `SelectItem`s: the six toolbars that did each shipped an uncontrolled `Select` that looked live but filtered nothing. Used on admin Payouts / Referrals / Partners / referral-detail invoices and partner My Referrals / Payouts. Story: `custom/time-range-select.stories.tsx`

### AvatarField — `custom/avatar-field.tsx`
Round profile-picture picker: shows the current avatar (via `UserAvatar`, initials fallback) with Change / Remove controls and an upload spinner overlay. Presentational — the parent owns the upload mutation and error toasts; picking a file calls `onSelect(file)` immediately (no pending-file preview). Accepts PNG/JPG (`ACCEPT_COVER_ATTR`, ≤5 MB, enforced server-side). Used by the partner profile page and the admin edit-partner dialog.

---

## `src/components/layout/` — app chrome

### BrandMark — `layout/brand-mark.tsx`
Clara Central brand lockup (`cb` glyph + wordmark). Single source of the brand mark; sizes `md | lg`, optional `href`, `glyphOnly` (glyph only — used by the collapsed admin sidebar rail). Used by the auth screens (and mirrored in the admin sidebar).

### AuthShell — `layout/auth-shell.tsx`
Centered full-screen frame for auth screens (password reset): faint monochrome dotted-grid backdrop + `BrandMark`, then the page content. Width controlled via `className`.

### AuthSplitShell — `layout/auth-split-shell.tsx`
Two-column auth frame for the **login** screens. Left: `BrandMark` (top-left) + an optional `topRight` slot (cross-portal link) + the page's form (`children`). Right (≥lg only): a decorative panel with a slowly drifting "aurora" gradient (`@keyframes aurora` in globals) and a gently floating product scene — commission-earned, closed-referral, and payout glass cards (`@keyframes float`, `caret-blink`). Used by the admin + partner login and the landing (portal-selection) screens.

### RoleSidebar — `layout/role-sidebar.tsx`
Config-driven left sidebar shared by **both** portals: brand + portal label, a nav section (active state from the current path), account menu pinned to the bottom. **Collapsible** to an icon-only rail via a toggle in the brand row; collapsed nav items show tooltips. Props: `nav` (`RoleNavItem[]`), `label`, `brandHref`, `sectionLabel`, `collapseCookie`, `profileHref` (optional — forwarded to the account menu's "Profile" item; set per portal by the shells). A `RoleNavItem` with `end: true` matches only its exact href (for index routes like the partner home). State persists in the per-portal `collapseCookie`, read in each `(panel)/layout.tsx` and passed as `defaultCollapsed` so the server renders the right width (no flash). Must be composed from a client component (it receives the icon-bearing `nav` — see `AdminShell`/`PartnerShell`, both `"use client"`).

### AdminShell — `layout/admin-shell.tsx`
Admin portal chrome (`"use client"`): `RoleSidebar` (with `ADMIN_NAV`, "Admin Panel", `admin_sidebar_collapsed`) + scrollable `max-w-7xl` content column. Wraps every `/admin/*` page.

### PartnerShell — `layout/partner-shell.tsx`
Partner portal chrome (`"use client"`): `RoleSidebar` (with `PARTNER_NAV`, "Partner Portal", `partner_sidebar_collapsed`) + scrollable `max-w-7xl` content column. Wraps every `/partner/*` page. Mirrors `AdminShell`.

### HeaderUserMenu — `layout/header-user-menu.tsx`
User profile dropdown: name/email + sign-out. Prop-driven (presentational). `compact` renders an avatar-only trigger (collapsed sidebar rail). `profileHref` (optional) adds a "Profile" item (a `Link`, above Sign Out) to the user's own account page. Story: `layout/header-user-menu.stories.tsx`

---

## `src/components/data-table/` — table composition

### DataTable — `data-table/data-table.tsx`
Generic table with sorting, column visibility, pagination. Built on TanStack Table. Story: `data-table/data-table.stories.tsx`
- `onRowClick(row)` — optional; makes rows clickable (cursor + navigation). Nested links/buttons must `stopPropagation` (e.g. the partner link in the referrals list). Used by the Referrals list to open a referral's detail.
- **Overflow:** the table wrapper is `overflow-x-auto`, so a table wider than its container scrolls horizontally rather than clipping its rightmost columns. Cells are `whitespace-nowrap`, so prefer few columns with `max-w-[…] truncate` on long text (name/email/company/notes) over adding more columns — keep list views focused on the essentials (identity, status, money) and defer the rest to the record's detail page.

### SortableHeader — `data-table/sortable-header.tsx`
Header cell with sort indicator (chevron up/down/none). Click to toggle. Story: `data-table/sortable-header.stories.tsx`

### ColumnVisibility — `data-table/column-visibility.tsx`
Dropdown menu for toggling visible columns. Story: `data-table/column-visibility.stories.tsx`

`index.ts` re-exports the public API.

---

## Conventions

- **Adding a new component**: pick the right folder per the table above. Add a `.stories.tsx` for any custom/layout/data-table addition.
- **Renaming/removing**: update this file in the same commit. If used elsewhere, also update `CODEMAP.md` reference.
- **Variants**: when adding a variant to an existing component, add a bullet to its entry above.
- **Cross-references**: composed-token patterns for a component live in `DESIGN.md`'s YAML front matter (`components.*`). Keep both files in sync.
