# Audit: Review, Fix & Test

Review changed code for quality and compliance, fix issues, then smoke-test ALL changed features end-to-end via Chrome DevTools.

## Phase 1: Identify Changes

Run `git diff HEAD --name-only -- "*.tsx" "*.ts"` and `git ls-files --others --exclude-standard -- "*.tsx" "*.ts"` to find changed/new files.

If no changes found, stop and tell the user.

## Phase 2: Single Combined Review Agent

Launch ONE haiku agent with ONLY the changed/new files. Check the 15-point checklist:

**Quality:** 1. Server action + RQ invalidation 2. Auth guard (getSessionContext) 3. Loading states 4. Error handling 5. Empty states 6. Constants/types from shared files
**Reuse:** 7. Shared service functions 8. Shared Zod schemas 9. Shared components 10. No duplication of existing logic
**Efficiency:** 11. No duplicate hooks 12. Promise.all for independent fetches 13. No memory leaks 14. No unstable refs 15. No raw Supabase `.from()` data queries

Report ONLY high-confidence violations with file:line.

## Phase 3: Fix Issues

Fix confirmed issues. Run `npm run build` to verify zero errors.

## Phase 4: End-to-End Test (Chrome DevTools MCP)

After build passes, test EVERY changed feature end-to-end via Chrome DevTools. **Test COMPLETE workflows, not just the first step.**

### 4.1 Setup
- Check dev server: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3003`
- Determine affected routes from changed files (check CODEMAP.md for route → file mapping)

### 4.2 Clara Central Feature Workflows

For each affected area, test the FULL lifecycle:

#### Partners workflow (if changed):
1. Navigate to Admin → Partners list
2. Verify KPI cards and table render
3. Test "Invite Partner" dialog — fill form → submit → verify invitation sent
4. Find a pending application → Approve → verify status changes
5. Click approved partner → verify detail page (info, referrals, payout history)
6. Edit partner rate → verify commission rate updates

#### Referrals workflow (if changed):
1. Navigate to Admin → Referrals list
2. Verify list renders with correct statuses (invited, converted, lost)
3. Click a referral → verify detail (partner attribution, conversion date if converted)
4. Test conversion action if applicable

#### Payments & Payouts workflow (if changed):
1. Navigate to Admin → Payments
2. Verify payments list with commission amounts
3. Navigate to Admin → Payout Invoices
4. Verify owed vs. paid amounts per partner
5. Test "Record Payout" action if applicable

#### Partner Portal (if changed):
1. Login as a partner
2. Verify dashboard shows referral count, conversion rate, earnings
3. Navigate to My Referrals — verify list and invitation link
4. Navigate to My Earnings — verify commission breakdown and payout ledger

#### Auth flows (if changed):
1. Test admin login at `/admin/login`
2. Test partner invitation link flow (if applicable)

### 4.3 Screenshot Everything

Take desktop and mobile screenshots for every page tested. Save to `qa/.media/audit/` (gitignored).

## Phase 5: Report Results

Summarize in a table with EVERY step tested:

| # | Test Step | Page | User | Result |
|---|-----------|------|------|--------|
| 1 | Admin login | /admin/login | Admin | PASS |
| 2 | Partners list loads | /admin/partners | Admin | PASS |
| 3 | Invite partner dialog | /admin/partners | Admin | PASS |
| ... | ... | ... | ... | ... |

**Bug found during testing? Follow this loop:**
1. Stop testing at the failing step
2. Investigate root cause (check console errors, read relevant code)
3. Fix the bug in code
4. Run `npm run build` to verify fix compiles
5. **Re-run the ENTIRE workflow that failed from step 1** (not just the failing step)
6. If it passes now, continue with remaining tests
7. If it fails again on a different step, repeat from step 1

Never report a test as PASS if it failed once and was fixed — mark it as **FIXED** and include the fix description. Only report final results after ALL workflows complete without errors.
