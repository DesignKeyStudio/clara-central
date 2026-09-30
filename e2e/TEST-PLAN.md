# Clara Central — Manual / MCP-Driven E2E Test Plan

> **What this is.** A plain-English test plan to verify the whole app works end-to-end by
> *driving a real browser* — by hand, or with an agent using the **Playwright MCP**
> (`mcp__playwright__browser_*`) or **Chrome DevTools MCP** (`mcp__chrome-devtools__*`) tools.
>
> **What this is NOT.** These are **not** the `*.spec.ts` files in this folder (those run in CI via
> `pnpm test:e2e`). This file is for exploratory / acceptance testing where a human or agent reads a
> case, performs the steps in a live browser, and confirms the expected result. Nothing here is
> executed by the Playwright test runner (it only matches `*.spec.ts`).

---

## 1. Before you start

### Environment
1. Point `.env.local` at a **test/staging** Supabase + Postgres (never production — these cases write real data).
2. Seed the database so the accounts and data below exist:
   ```bash
   pnpm exec prisma db seed
   ```
3. Run the app in **real auth mode** (prototype mode bypasses login and the partner portal):
   ```bash
   NEXT_PUBLIC_PROTOTYPE_MODE=false pnpm dev      # serves http://localhost:3003
   ```
4. Drive `http://localhost:3003` with the browser MCP of your choice.

> Note: `pnpm test:e2e` does **not** use this server. `playwright.config.ts` starts its own on
> `E2E_PORT` (default 3000) — set `E2E_BASE_URL=http://localhost:3003` to point the suite at a
> dev server you're already running.

### Test accounts
| Role | Email | How to sign in |
|------|-------|----------------|
| Admin | `admin@example.com` | password `AdminPass123!` |
| Partner | `jordan@diazgroup.com` | OTP — **any 6 digits** (e.g. `123456`); the code is mocked server-side |

### How an agent should drive each step
- **Navigate:** `browser_navigate` (Playwright) / `navigate_page` (DevTools).
- **See the page:** take a `browser_snapshot` / `take_snapshot` first — it gives the accessibility tree with the element refs/roles you click.
- **Act:** click by role+name, type into fields by label, use `browser_fill_form` for multi-field forms.
- **Assert:** confirm the expected heading / row / text / URL is present in the next snapshot.
- Prefer **role / label / visible-text** targets (they're in every step below) over CSS.

### Conventions
- Each case is tagged **[Read-only]** (safe to run anytime) or **[Mutating]** (changes seeded data).
- 🔁 **After running the [Mutating] cases, reseed** to restore known values: `pnpm exec prisma db seed`.
  (Marketing items are *not* reseeded — clean those up by hand, see §I.)
- Money renders as **whole dollars, no cents** (`$870`, `$3,270`). Dates in tables/KPIs render `MM/DD/YYYY`.
- Window-state expectations assume the clock is **mid-2026** (the seed is built around 2026-06-05).
  If your machine's date is much later, some "Active" windows will read "Expired" — that's expected.

---

## 2. Seed data reference (the source of truth for assertions)

**AppConfig:** standard commission rate **10%**, commission window **12 months**.

### Partners (commission rate is per-partner, applies to all their referrals)
| Partner | Email | Entry | Status | Rate | Referrals | Invoices | Earned | Paid | **Owed** |
|---------|-------|-------|--------|-----:|----------:|---------:|-------:|-----:|---------:|
| Jordan Diaz (Diaz Group) | jordan@diazgroup.com | Self sign-up | Approved | 12% | 3 | 4 | $870 | $870 | **$0** |
| Priya Shah (Shah & Co) | priya@shahco.com | Invited | Approved | 10% | 4 | 5 | $1,580 | $1,080 | **$500** |
| Liam Walsh (Walsh Advisory) | liam@walshadvisory.com | Invited | Approved | 15% | 2 | 3 | $3,270 | $0 | **$3,270** |
| Nadia Okafor (Okafor Consulting) | nadia@okaforllc.com | Self sign-up | **Pending** | 10% | 0 | 0 | $0 | $0 | $0 |

> Earned = Σ(paid invoices) × rate. Owed = Earned − Paid. Jordan is fully paid (owed $0 → "Record payout" disabled).

### Key referrals (for detail-page assertions)
| Ref | Contact | Owner | Status | Window state | Earned | Paid | Owed | Invoices |
|-----|---------|-------|--------|--------------|-------:|-----:|-----:|---------:|
| r1 | Dr. Helen Park (Westside Dental) | Jordan (12%) | Deal closed | **Active** (≈04/02/2027) | $870 | $870 | $0 | 3 |
| r3 | Brightpath Clinic | Liam (15%) | Proposal sent | **Active** (≈04/14/2027) | $3,270 | $0 | $3,270 | 3 |
| r5 | Orion Logistics | Priya (10%) | Deal closed | **Contract ended** (05/20/2026) | $1,080 | $1,080 | $0 | 3 |
| r9 | Lakeside Property Mgmt | Priya (10%) | Deal closed | **Expired** (03/10/2026) | $500 | $0 | $500 | 1 |

> r9 proves a subtle rule: its window has **lapsed**, yet its one paid invoice ($5,000 × 10% = **$500**) still
> counts as earned commission. The window gates whether *new* invoices accrue, not historical paid ones.

### r1 invoices (Dr. Helen Park, Jordan @ 12%)
| Invoice | Amount | Status | Commission (amount × 12%) |
|---------|-------:|--------|--------------------------:|
| INV-2041 | $4,500 | Paid | $540 |
| INV-2042 | $3,000 | Sent | $360 |
| INV-2091 | $2,750 | Paid | $330 |

### r3 invoices (Brightpath Clinic, Liam @ 15%)
| Invoice | Amount | Status | Commission (amount × 15%) |
|---------|-------:|--------|--------------------------:|
| INV-2061 | $8,500 | Sent | $1,275 |
| INV-2062 | $12,000 | Paid | $1,800 |
| INV-2111 | $9,800 | Paid | $1,470 |

### Payouts (2 seeded)
| Date | Partner | Amount | Note to partner | Private note (admin-only) |
|------|---------|-------:|-----------------|---------------------------|
| 05/03/2026 | Priya Shah | $1,080 | Commission for Orion Logistics close | ACH batch payment |
| 05/01/2026 | Jordan Diaz | $870 | Q2 2026 commission payment | Wire transfer ref #WT-4421 |

---

## A. Landing & Authentication (logged out)

### AUTH-01 — Landing offers both portals · [Read-only]
1. Go to `/`.
2. **Expect:** the page shows links/cards for **"Partner Portal"** (→ `/partner/login`, CTA "Enter portal") and **"Admin Panel"** (→ `/admin/login`, CTA "Open admin"), plus the tagline "Referral & partner management for your bookkeeping practice."

### AUTH-02 — Admin signs in with valid credentials · [Read-only]
1. Go to `/admin/login`.
2. Fill **Email** = `admin@example.com`, **Password** = `AdminPass123!`. Click **Sign in**.
3. **Expect:** redirected to `/admin`; heading **"Dashboard"** is visible.

### AUTH-03 — Admin sign-in rejects a wrong password · [Read-only]
1. Go to `/admin/login`. Fill Email = `admin@example.com`, Password = `definitely-wrong`. Click **Sign in**.
2. **Expect:** stays on `/admin/login`; error **"Invalid email or password."** is shown.

### AUTH-04 — Partner signs in via OTP · [Read-only]
1. Go to `/partner/login`. Fill **Email** = `jordan@diazgroup.com`. Click **Send code**.
2. The view switches to "Enter your code". Fill **6-digit verification code** = `123456`. Click **Verify & sign in**.
3. **Expect:** redirected to `/partner`; heading **"My Referrals"** is visible.

### AUTH-05 — Partner OTP rejects an unknown email · [Read-only]
1. Go to `/partner/login`. Email = `nobody@nowhere.test` → **Send code** → code `123456` → **Verify & sign in**.
2. **Expect:** error **"No active partner account for that email."** (no redirect to `/partner`).

### AUTH-06 — Forgot-password sends a generic confirmation · [Read-only]
1. Go to `/admin/login`, click **Forgot?** (→ `/admin/forgot-password`).
2. Fill **Email** = `admin@example.com`. Click **Send reset link**.
3. **Expect:** confirmation "If an account exists for admin@example.com, a reset link is on its way." (generic — should say the same for an unknown email, so it can't be used to enumerate accounts).

### AUTH-07 — Unauthenticated access is bounced to landing · [Read-only]
1. With no session, go to `/admin`. **Expect:** redirected to `/`.
2. With no session, go to `/partner`. **Expect:** redirected to `/`.

---

## B. Admin — Partners list  *(session: admin)*

### PART-01 — Partners list + KPI cards · [Read-only]
1. Go to `/admin/partners`. **Expect:** heading **"Partners"**, subtitle "Everyone in the referral program."
2. **Expect KPI cards:** **Total partners = 4**, **Total referrals = 9**, **Total commission = $5,720**.
3. **Expect** all four partners listed: Jordan Diaz, Priya Shah, Liam Walsh, Nadia Okafor.
4. **Expect** footer "Showing 4 of 4 partners".

### PART-02 — Partner row values are correct · [Read-only]
1. On `/admin/partners`, read the **Jordan Diaz** row.
2. **Expect:** Company "Diaz Group", Entry "Self sign-up", Status "Approved", Rate 12%, Comm. Paid **$870**, Comm. Owed **$0**, Invoices **4**.
3. Read the **Liam Walsh** row → Rate 15%, Comm. Paid **$0**, Comm. Owed **$3,270**, Invoices **3**.
4. Read the **Nadia Okafor** row → Status **"Pending"**, Last login **"Never"**, and inline **Approve** / **Reject** action buttons (pending partners only).

### PART-03 — Search filters the list · [Read-only]
1. In **Search partners**, type `walsh`.
2. **Expect:** only **Liam Walsh** remains; footer "Showing 1 of 4 partners".
3. Clear search → all 4 return.

### PART-04 — Status filter · [Read-only]
1. Set **Filter by status** = **Pending**.
2. **Expect:** only **Nadia Okafor** shown.
3. Set it to **Approved** → the other three shown, Nadia hidden.

### PART-05 — Row click opens the detail page · [Read-only]
1. Click the **Jordan Diaz** row (or name link).
2. **Expect:** navigates to `/admin/partners/<id>`; heading shows **"Jordan Diaz"**.

---

## C. Admin — Partner detail  *(session: admin)*

### PART-06 — Jordan's KPIs + info are correct · [Read-only]
1. Open Jordan Diaz's detail page (from PART-05).
2. **Expect KPI cards:** Referrals **3**, Commission earned **$870**, Commission paid **$870** ("1 payout"), Commission owed **$0**.
3. **Expect** info card: Email `jordan@diazgroup.com`, Commission rate 12%, Entry type "Self sign-up", plus "How did you hear about us?" and "What types of businesses…" sections (self-signup fields).
4. **Expect** "Their referrals" section listing **Dr. Helen Park**, **Tara Nguyen**, **Ana Reyes** (3 rows).

### PART-07 — "Record payout" is disabled when nothing is owed · [Read-only]
1. On Jordan's detail page (owed = $0), hover the **Record payout** button.
2. **Expect:** the button is **disabled**, tooltip/title "No unpaid commission to pay out".

### PART-08 — Liam detail shows owed commission · [Read-only]
1. Open Liam Walsh's detail page.
2. **Expect:** Referrals **2**, Commission earned **$3,270**, Commission paid **$0**, Commission owed **$3,270**; **Record payout** is **enabled**.

### PART-09 — Edit a partner · [Mutating] 🔁
1. On Jordan's detail page, click **Edit partner**. Dialog "Edit partner" opens.
2. Change **Location** to `Dallas, TX` and **Commission rate (%)** to `15`. Click **Save changes**.
3. **Expect:** toast "Partner updated"; dialog closes; info card now shows rate **15%**.
4. **Expect (commission re-derives):** Jordan's referral commissions recompute at 15% — Commission earned becomes **$1,087.50** ($7,250 × 15%; may display rounded as `$1,088`). Reseed afterward to restore 12%.

### PART-10 — Record a partner-level payout, capped at owed · [Mutating] 🔁
1. Open **Liam Walsh** (owed $3,270). Click **Record payout**. Dialog "Record a payout" opens.
2. **Expect** stat boxes: Total commission $3,270, Already paid $0, Available to pay out **$3,270**; help text "Cannot exceed $3,270."
3. Enter **Amount** = `5000`. **Expect:** validation error "Amount exceeds the unpaid commission of $3,270." and the **Record payout** button stays disabled.
4. Change Amount to `1000`, add Note to partner "QA test payout". Click **Record payout**.
5. **Expect:** toast "Payout recorded"; KPIs update to Commission paid **$1,000**, Commission owed **$2,270**. Reseed afterward.

### PART-11 — Invite a partner · [Mutating] 🔁
1. Go to `/admin/partners`, click **Invite Partner**. Dialog "Invite a partner" opens.
2. Fill **Full name** = `Test Invitee`, **Email** = `test.invitee@example.com`, **Commission rate (%)** = `10`. Click **Send invitation**.
3. **Expect:** the dialog switches to **"Invitation sent"** with a read-only **Invitation link** field and a **Copy link** button.
4. Copy the link, click **Done**. (Optionally open the link in a fresh/incognito context for ONB-02.) Reseed afterward to drop the test invite.

---

## D. Admin — Approve / Reject  *(session: admin)*

### PART-12 — Approve a pending self-signup partner · [Mutating] 🔁
1. Go to `/admin/partners`, filter status = **Pending** → **Nadia Okafor** appears with **Approve** / **Reject**.
2. Click **Approve**.
3. **Expect:** toast "Nadia Okafor approved"; her status flips to **Approved** (provisions her auth user behind the scenes). Reseed afterward.

---

## E. Admin — Referrals list  *(session: admin)*

### REF-01 — Referrals list shows every partner's referrals · [Read-only]
1. Go to `/admin/referrals`. **Expect:** heading "Referrals", subtitle "Every referral across all partners.", footer "Showing 9 of 9 referrals".
2. **Expect** both **Dr. Helen Park** (Jordan's) and **Marcus Lee** (Priya's) are visible — admin sees across all partners.

### REF-02 — Search referrals · [Read-only]
1. In **Search referrals**, type `orion`. **Expect:** only **Orion Logistics** (r5) shown.
2. Clear → all 9 return.

### REF-03 — Filter by status · [Read-only]
1. Set **Filter by status** = **Deal closed**.
2. **Expect:** 3 rows — Dr. Helen Park (r1), Orion Logistics (r5), Lakeside Property Mgmt (r9).

### REF-04 — Row click opens the referral detail · [Read-only]
1. Click the **Dr. Helen Park** row.
2. **Expect:** navigates to `/admin/referrals/<id>`; heading "Dr. Helen Park"; subtitle includes "by Jordan Diaz".

---

## F. Admin — Referral detail  *(session: admin)*

### REF-05 — r1 (Active window) KPIs + invoice commissions · [Read-only]
1. Open **Dr. Helen Park** (r1).
2. **Expect KPIs:** Total commission **$870**, Paid commission **$870** ("1 payout"), Invoices **3**.
3. **Expect** commission-window banner indicates the window is **open / Active** through ≈04/02/2027.
4. **Expect** the **Client invoices** table:
   - INV-2041 — $4,500 — **Paid** — commission **$540**
   - INV-2042 — $3,000 — **Sent** — commission **$360**
   - INV-2091 — $2,750 — **Paid** — commission **$330**
5. **Expect** "Record payment" is **disabled** (owed $0); "Add invoice" is **enabled** (window active).

### REF-06 — r5 (Contract ended) gates new invoices · [Read-only]
1. Open **Orion Logistics** (r5).
2. **Expect:** banner reads to the effect of "Commission window closed early — the client's contract ended 05/20/2026."; the contract toggle shows **"Reopen contract"**.
3. **Expect:** **Add invoice** is **disabled** with tooltip "Reopen the commission window to add invoices".
4. **Expect KPIs:** Total commission **$1,080**, Paid **$1,080**.

### REF-07 — r9 (Expired window) still counts historical commission · [Read-only]
1. Open **Lakeside Property Mgmt** (r9).
2. **Expect:** banner indicates the window is **closed / Expired** (≈03/10/2026); Add invoice **disabled**.
3. **Expect KPIs:** Total commission **$500**, Invoices **1** (INV-1990 $5,000 Paid → $500). ✅ Confirms expired-window referrals keep their already-earned commission.

### REF-08 — Change the pipeline status · [Mutating] 🔁
1. Open **Tara Nguyen** (r4, currently "Contacted"). Open the status control ("Change referral status").
2. Select **Meeting scheduled**.
3. **Expect:** the referral's status badge updates to "Meeting scheduled" (persists on reload). Reseed afterward.

### REF-09 — Add an invoice (with commission preview) · [Mutating] 🔁
1. Open **Dr. Helen Park** (r1). Click **Add invoice**. Dialog "Add invoice" opens.
2. Leave Invoice ID blank (auto-generates), set **Amount** = `1000`, **Status** = **Paid**.
3. **Expect** the commission-preview line shows "Commission on this invoice: **$120** (12% of $1,000)".
4. Click **Add invoice**.
5. **Expect:** toast "Invoice added"; a new invoice row appears; **Total commission** rises from $870 to **$990** (+$120, since it's Paid). Reseed afterward.

### REF-10 — Inline invoice status change re-derives commission · [Mutating] 🔁
1. Open **Dr. Helen Park** (r1). In the invoice table, change **INV-2042** ($3,000, currently **Sent**) to **Paid** via its inline status control.
2. **Expect:** toast "Invoice updated"; **Total commission** rises by $360 (3,000 × 12%) from $870 to **$1,230**. Reseed afterward.

### REF-11 — Record a referral-level payment, capped at owed · [Mutating] 🔁
1. Open **Brightpath Clinic** (r3, owed $3,270). Click **Record payment**. Dialog "Record a payment" opens.
2. **Expect** stat boxes: Earned on this referral $3,270, Already paid $0, Available to pay out **$3,270**.
3. Enter Amount = `4000` → **Expect** error "Amount exceeds the unpaid commission of $3,270." and submit disabled.
4. Change Amount to `1000`, click **Record payment**.
5. **Expect:** toast "Payment recorded"; Paid commission becomes **$1,000**, Available to pay out **$2,270**. The payout also appears on Liam's partner detail and the admin Payouts list. Reseed afterward.

### REF-12 — Contract toggle reopens / closes the window · [Mutating] 🔁
1. Open **Orion Logistics** (r5, contract ended). Click **Reopen contract**.
2. **Expect:** banner switches to an open/Active window; **Add invoice** becomes **enabled**; toggle now reads **"Mark contract ended"**.
3. Click **Mark contract ended** to restore. Reseed afterward to be safe.

---

## G. Admin — Payouts  *(session: admin)*

### PAYOUT-01 — Payouts list + KPIs · [Read-only]
1. Go to `/admin/payouts`. **Expect:** heading "Payouts"; KPIs **Total paid out = $1,950**, **Payouts = 2**.
2. **Expect** two rows (newest first):
   - 05/03/2026 — **Priya Shah** — **$1,080** — "Commission for Orion Logistics close" — private "ACH batch payment"
   - 05/01/2026 — **Jordan Diaz** — **$870** — "Q2 2026 commission payment" — private "Wire transfer ref #WT-4421"
3. **Expect:** the **Private note** column IS visible here (admin view).

### PAYOUT-02 — Search payouts · [Read-only]
1. In **Search payouts**, type `orion`. **Expect:** only the Priya / Orion row remains.

---

## H. Admin — Marketing  *(session: admin)*

> Marketing content is **not** reseeded. Delete anything you create here at the end of the run.
> File uploads need a real local file; with the Playwright MCP use `browser_file_upload` after the
> file chooser opens (Chrome DevTools MCP: `upload_file`).

### MKT-01 — Marketing page loads · [Read-only]
1. Go to `/admin/marketing`. **Expect:** heading "Marketing Materials", subtitle "What partners see — with edit controls.", and an **Add section** button. (If empty: "No sections yet — add one to start organizing marketing materials.")

### MKT-02 — Create a section · [Mutating] 🧹
1. Click **Add section**. Dialog "Add section". Enter **Section title** = `QA Test Section`. Click **Add section**.
2. **Expect:** toast "Section created"; a card titled "QA Test Section" appears with **Upload file** / **Add link** controls and empty-state "No items yet — upload a file or add a link."

### MKT-03 — Add a link item · [Mutating] 🧹
1. In "QA Test Section" click **Add link**. Dialog "Add a link".
2. **Link title** = `QA Example Link`, **URL** = `https://example.com`. Click **Add link**.
3. **Expect:** toast "Link added"; the item appears in the section.

### MKT-04 — Upload a file item · [Mutating] 🧹
1. In "QA Test Section" click **Upload file**. Dialog "Upload a file".
2. Choose a small PDF/PNG via the file input, set **Display name** = `QA Doc`. Click **Add file**.
3. **Expect:** progress "Uploading…" then toast "File added"; the item appears.

### MKT-05 — Edit, reorder, delete · [Mutating] 🧹
1. Use the item's **Edit** control → change the display name → **Save changes** → toast "File updated"/"Link updated".
2. Use **Move up / Move down** on an item and confirm the order changes.
3. **Delete** the item → confirm dialog "Delete \"…\"?" → **Delete item** → toast "Item deleted".
4. **Delete** the section → confirm "Delete \"QA Test Section\"?" → **Delete section** → toast "Section deleted". (Cleans up everything created in MKT-02→05.)

---

## I. Admin — Settings  *(session: admin)*

### SET-01 — Settings show seeded defaults · [Read-only]
1. Go to `/admin/settings`. **Expect:** heading "Settings"; **Standard commission rate (%)** = `10`, **Commission window (months)** = `12`.

### SET-02 — Save new defaults · [Mutating] 🔁
1. Change **Standard commission rate (%)** to `11`. Click **Save changes**.
2. **Expect:** toast "Settings saved"; value persists on reload. (Affects only *new* partners/invites, not existing rates.) Reseed afterward to restore 10%.

### SET-03 — Validation rejects out-of-range values · [Read-only]
1. Try Standard commission rate = `150` (max is 100) and Commission window = `0` (min is 1).
2. **Expect:** the form blocks the save / shows validation errors; no toast.

---

## J. Partner Portal — My Referrals  *(session: partner = Jordan)*

### PP-01 — Partner sees only their own referrals · [Read-only]
1. Sign in as the partner (AUTH-04). On `/partner`, **Expect** heading "My Referrals" and subtitle ending "Commission rate: **12%**".
2. **Expect** rows for **Dr. Helen Park**, **Tara Nguyen**, **Ana Reyes** (Jordan's 3 referrals); footer "Showing 3 of 3 referrals".
3. **Expect NOT** to see **Marcus Lee**, **Orion Logistics**, **Brightpath Clinic** (other partners' referrals) anywhere.

### PP-02 — Per-referral commission totals · [Read-only]
1. On `/partner`, read the **Dr. Helen Park** row → Status "Deal closed", **Total commission $870**, last invoice ≈04/20/2026.
2. **Tara Nguyen** row → Status "Contacted", **Total commission $0**, last invoice "—" (no invoices).
3. **Ana Reyes** row → Total commission **$0** (her one invoice INV-2081 is *Sent*, not Paid yet).

### PP-03 — Refer a contact · [Mutating] 🔁
1. Click **Refer a contact**. Dialog "Refer a contact" opens; note it shows "Your commission rate: 12% applied to paid invoices for this referral."
2. Fill **Contact name** = `QA Prospect`, **Company** = `QA Co`. Click **Submit referral**.
3. **Expect:** toast "Referral submitted"; a new **QA Prospect** row appears with status **Submitted** and Total commission $0. Reseed afterward.

### PP-04 — Status filter (partner) · [Read-only]
1. Set **Filter by status** = **Deal closed** → only **Dr. Helen Park** remains.

---

## K. Partner Portal — Payouts  *(session: partner = Jordan)*

### PP-05 — Partner sees only their own payout · [Read-only]
1. Go to `/partner/payouts`. **Expect:** heading "Payouts"; KPIs **Total paid out = $870**, **Payouts = 1**.
2. **Expect** one row: 05/01/2026 — **$870** — "Q2 2026 commission payment".
3. **Expect** the cadence note "Commission is paid out every 2 months. You earn commission on each referral for up to 12 months from the referral date."

### PP-06 — Private notes never leak to the partner · [Read-only] 🔒
1. On `/partner/payouts`, inspect the $870 payout row and its details.
2. **Expect:** the admin-only private note **"Wire transfer ref #WT-4421" is NOT present** anywhere on the partner page (only the public note shows). This is a key data-confidentiality check.

---

## L. Partner Portal — Marketing  *(session: partner = Jordan)*

### PP-07 — Read-only marketing library · [Read-only]
1. Go to `/partner/marketing`. **Expect:** heading "Marketing Materials", subtitle "Brand assets and collateral to share with prospects."
2. **Expect NO** authoring controls (no "Add section", no Edit/Delete) — partners only consume.
3. If MKT items exist: each card shows a type pill and a **Download** (files) or **Open** + **Copy** (links) action, and a **View** preview. (If none: "No marketing materials are available yet — check back soon.")

### PP-08 — Preview / open / copy work · [Read-only]
*(Requires at least one marketing item — create one as admin first, or run after §H.)*
1. On a file card, click **View** → preview dialog opens (image/PDF inline); **Download** works.
2. On a link card, click **Copy** → toast "Link copied to clipboard"; **Open** launches the URL.

---

## M. Authorization & data isolation

### ISO-01 — Admin is confined to the admin portal · [Read-only] 🔒
1. As **admin**, navigate to `/partner`. **Expect:** middleware redirects to `/admin`.

### ISO-02 — Partner is confined to the partner portal · [Read-only] 🔒
1. As **partner**, navigate to `/admin`. **Expect:** middleware redirects to `/partner`.
2. Also try `/admin/partners` and `/admin/payouts` as the partner → **Expect** redirect to `/partner` (no admin data exposed).

### ISO-03 — Authenticated users are bounced off auth pages · [Read-only]
1. As **admin**, go to `/admin/login`. **Expect:** redirected into `/admin` (already signed in).
2. As **partner**, go to `/partner/login`. **Expect:** redirected into `/partner`.

---

## N. Onboarding (public, logged out)

### ONB-01 — Self-registration ("Apply to join") · [Mutating] 🔁
1. Go to `/partner/login`, click **"Apply to join the program"** (→ `/apply`). (Or go to `/apply` directly.)
2. Fill the onboarding form (apply mode): **Full name** = `QA Applicant`, **Email address** = `qa.applicant@example.com`, **How did you hear about us?** = `LinkedIn`, **What types of businesses…** = `Local cafes`, tick both agreement checkboxes. Click **Submit application**.
3. **Expect:** the "Application received" screen with a **"Pending approval"** badge.
4. **Verify (as admin):** `/admin/partners` filtered to **Pending** now shows **QA Applicant** (a `pending` / self-signup partner, no auth user yet). Reseed afterward to remove it.

### ONB-02 — Invalid invite token shows a friendly screen · [Read-only]
1. Go to `/invite/not-a-real-token`.
2. **Expect:** "Invitation unavailable" with text about the link being invalid or expired (no crash, no form).

### ONB-03 — Valid invite onboarding (optional, pairs with PART-11) · [Mutating] 🔁
1. Using the link captured in **PART-11**, open `/invite/<token>` in a fresh/incognito context.
2. **Expect:** the onboarding form in **invite** mode with the **Email address locked** to the invited address.
3. Complete it (tick agreements) → click **Complete & enter portal**.
4. **Expect:** an auth user is created and you land on `/partner` as the new (already-approved) partner. Reseed afterward.

---

## O. Suggested run orders

- **Quick smoke (read-only, ~5 min):** AUTH-01, AUTH-02, AUTH-04, PART-01, REF-01, PAYOUT-01, PP-01, PP-06, ISO-01, ISO-02.
- **Commission-math integrity:** PART-02, PART-06, PART-08, REF-05, REF-07, PP-02, PAYOUT-01 — these together prove earned/paid/owed are derived correctly across the partner, referral, and payout views.
- **Full regression:** run every case top to bottom, then `pnpm exec prisma db seed` to reset, and hand-delete any leftover marketing items from §H.
