import { afterEach, describe, expect, it, vi } from "vitest";

import { withinTimeRange } from "@/lib/utils";

// The "Any time / Last N days" toolbar filter (admin + partner list pages). Ranges are
// calendar days in the VIEWER's timezone, inclusive of today, so these tests pin the
// boundary days and the timezone-safety of date-only values (a `YYYY-MM-DD` must not be
// read as UTC midnight — that shifts a day for viewers west of UTC).

// Fixed "now": late evening local, which is already the next day in UTC. Any UTC-based
// implementation would mis-bucket the boundary rows below.
const NOW = new Date(2026, 6, 31, 22, 30); // 2026-07-31 22:30 local

const freezeNow = () => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
};

afterEach(() => {
  vi.useRealTimers();
});

describe("withinTimeRange", () => {
  it("keeps every row under 'any', including missing dates", () => {
    freezeNow();
    expect(withinTimeRange("2019-01-01", "any")).toBe(true);
    expect(withinTimeRange(null, "any")).toBe(true);
    expect(withinTimeRange(undefined, "any")).toBe(true);
  });

  it("matches today (the local calendar day, not the UTC one)", () => {
    freezeNow();
    expect(withinTimeRange("2026-07-31", "7d")).toBe(true);
    expect(withinTimeRange("2026-07-31T00:00:00.000Z", "7d")).toBe(true);
  });

  it("includes the first day of a 7-day window and excludes the day before it", () => {
    freezeNow();
    // 7 days inclusive of today: 2026-07-25 … 2026-07-31.
    expect(withinTimeRange("2026-07-25", "7d")).toBe(true);
    expect(withinTimeRange("2026-07-24", "7d")).toBe(false);
  });

  it("includes the first day of a 30-day window and excludes the day before it", () => {
    freezeNow();
    expect(withinTimeRange("2026-07-02", "30d")).toBe(true);
    expect(withinTimeRange("2026-07-01", "30d")).toBe(false);
  });

  it("includes the first day of a 90-day window and excludes the day before it", () => {
    freezeNow();
    expect(withinTimeRange("2026-05-03", "90d")).toBe(true);
    expect(withinTimeRange("2026-05-02", "90d")).toBe(false);
  });

  it("never hides a future-dated record", () => {
    freezeNow();
    expect(withinTimeRange("2026-08-15", "7d")).toBe(true);
  });

  it("drops rows with no usable date from a narrowed range", () => {
    freezeNow();
    expect(withinTimeRange(null, "30d")).toBe(false);
    expect(withinTimeRange("", "30d")).toBe(false);
    expect(withinTimeRange("not-a-date", "30d")).toBe(false);
  });
});
