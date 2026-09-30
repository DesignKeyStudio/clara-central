import { Decimal } from "@prisma/client/runtime/library";
import { addMonths } from "date-fns";
import { describe, expect, it } from "vitest";

import { commissionWindow, round2, windowedCommission } from "@/lib/services/partner-service";

// Pure commission-engine logic (domain Rules 1, 3, 4). The seed data keeps every
// paid invoice inside its window, so these tests are what actually exercise the
// out-of-window exclusion and the contract-ended/expired state derivation.

const VALID_MONTHS = 12;
const utc = (s: string) => new Date(`${s}T00:00:00Z`);

// A paid invoice issued on `date` for `amount` (Prisma Decimal, like the DB returns).
const paid = (date: string, amount: number) =>
  ({ status: "paid" as const, issuedDate: utc(date), amount: new Decimal(amount) });
const sent = (date: string, amount: number) =>
  ({ status: "sent" as const, issuedDate: utc(date), amount: new Decimal(amount) });

describe("commissionWindow (Rules 3-4)", () => {
  const created = utc("2025-01-01");
  const timeout = addMonths(created, VALID_MONTHS); // 2026-01-01

  it("is active while before the natural timeout (no contract end)", () => {
    const w = commissionWindow(created, null, VALID_MONTHS, utc("2025-06-01"));
    expect(w.state).toBe("active");
    expect(w.closeDate.getTime()).toBe(timeout.getTime());
  });

  it("is expired once the timeout passes (no contract end)", () => {
    const w = commissionWindow(created, null, VALID_MONTHS, utc("2026-06-01"));
    expect(w.state).toBe("expired");
    expect(w.closeDate.getTime()).toBe(timeout.getTime());
  });

  it("closes early as contract_ended when the contract ends before the timeout and that date has passed", () => {
    const contractEnd = utc("2025-04-01");
    const w = commissionWindow(created, contractEnd, VALID_MONTHS, utc("2025-06-01"));
    expect(w.state).toBe("contract_ended");
    expect(w.closeDate.getTime()).toBe(contractEnd.getTime()); // MIN(timeout, contractEnd)
  });

  it("stays active when a contract-end date is set in the FUTURE (regression: was wrongly contract_ended)", () => {
    const futureContractEnd = utc("2025-10-01"); // before timeout, but after `now`
    const w = commissionWindow(created, futureContractEnd, VALID_MONTHS, utc("2025-06-01"));
    expect(w.state).toBe("active");
    expect(w.closeDate.getTime()).toBe(futureContractEnd.getTime());
  });

  it("reports expired (timeout wins) when the contract ends on/after the timeout", () => {
    const lateContractEnd = utc("2026-06-01"); // after the 2026-01-01 timeout
    const w = commissionWindow(created, lateContractEnd, VALID_MONTHS, utc("2026-03-01"));
    expect(w.state).toBe("expired");
    expect(w.closeDate.getTime()).toBe(timeout.getTime()); // MIN clamps to the timeout
  });
});

describe("windowedCommission (Rule 1)", () => {
  const closeDate = utc("2026-01-01");
  const rate = 10; // %

  it("counts paid invoices issued on/before the window close", () => {
    const invoices = [paid("2025-06-01", 1000), paid("2025-12-31", 500)];
    expect(windowedCommission(invoices, rate, closeDate)).toBe(150); // (1000+500) * 10%
  });

  it("excludes paid invoices issued AFTER the window close (the money bug)", () => {
    const invoices = [paid("2025-06-01", 1000), paid("2026-02-01", 9999)];
    expect(windowedCommission(invoices, rate, closeDate)).toBe(100); // out-of-window 9999 dropped
  });

  it("includes an invoice issued exactly on the close date (inclusive boundary)", () => {
    expect(windowedCommission([paid("2026-01-01", 2000)], rate, closeDate)).toBe(200);
  });

  it("excludes non-paid invoices regardless of date", () => {
    expect(windowedCommission([sent("2025-06-01", 5000)], rate, closeDate)).toBe(0);
  });

  it("returns 0 with no paid in-window invoices", () => {
    expect(windowedCommission([], rate, closeDate)).toBe(0);
    expect(windowedCommission([paid("2026-05-01", 5000)], rate, closeDate)).toBe(0);
  });

  it("sums raw then rounds (CW-3) — the authoritative total, which can differ from rounding each line item", () => {
    // Each invoice's raw commission is 12.5125; the UI now carries that full precision
    // per row (rounding only at display) so the headline never double-rounds.
    const fracRate = 12.5;
    const invoices = [paid("2025-06-01", 100.1), paid("2025-07-01", 100.1)];
    // Sum-then-round: round2(12.5125 + 12.5125) = round2(25.025) = 25.03 — authoritative.
    expect(windowedCommission(invoices, fracRate, closeDate)).toBe(25.03);
    // Round-each-then-sum (the old per-row double-round) would give 25.02 — the divergence.
    expect(round2(12.5125) + round2(12.5125)).toBe(25.02);
  });
});

describe("commission-rate snapshot (TKT-005 — rate-change stability)", () => {
  // Earned commission is computed from the rate SNAPSHOTTED onto each referral at
  // creation (Referral.commissionRate), never the partner's live rate. These tests
  // pin the invariant at the pure-function boundary the services feed: the snapshot
  // rate is the only rate that reaches `windowedCommission`.
  const closeDate = utc("2026-01-01");
  const invoices = [paid("2025-06-01", 1000)];

  it("earned commission follows the referral's snapshot rate, not the partner's later rate", () => {
    // Referral created while the partner's rate was 10% → snapshot 10%.
    const snapshotRate = 10;
    expect(windowedCommission(invoices, snapshotRate, closeDate)).toBe(100);

    // The partner later raises their rate to 20%. The existing referral keeps its
    // 10% snapshot, so its earned commission does NOT change — no retroactive re-pricing.
    expect(windowedCommission(invoices, snapshotRate, closeDate)).toBe(100);

    // A NEW referral created after the change snapshots 20% and earns at the new rate.
    const newSnapshotRate = 20;
    expect(windowedCommission(invoices, newSnapshotRate, closeDate)).toBe(200);
  });

  it("two referrals under one partner can carry different snapshot rates", () => {
    const older = windowedCommission([paid("2025-05-01", 500)], 12, closeDate); // snapshot 12%
    const newer = windowedCommission([paid("2025-09-01", 500)], 18, closeDate); // snapshot 18%
    expect(older).toBe(60);
    expect(newer).toBe(90);
    // The partner's owed total is the sum of each referral's own-rate commission.
    expect(round2(older + newer)).toBe(150);
  });
});

describe("round2", () => {
  it("rounds money/percent drift to two decimals", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(1234.567)).toBe(1234.57);
  });
});
