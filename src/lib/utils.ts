import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a date string (YYYY-MM-DD or ISO) to MM/DD/YYYY */
export function formatDate(value: string | undefined | null): string {
  if (!value) return "—";
  const parts = value.split("T")[0].split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${m}/${d}/${y}`;
  }
  return value;
}

/**
 * Parse a `YYYY-MM-DD` (or full ISO) string into a Date at **local** midnight.
 * Avoids `new Date("YYYY-MM-DD")`, which parses as UTC midnight and renders a day
 * early for viewers west of UTC. Returns undefined for empty/malformed input.
 */
export function parseLocalDate(value: string | undefined | null): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split("T")[0].split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

/**
 * Format a Date to a LOCAL-timezone `YYYY-MM-DD` string. Use this (never
 * `toISOString().slice(0, 10)`, which yields the UTC date) whenever you turn a
 * Date back into a calendar-date value — the UTC variant lands a day ahead for
 * users west of UTC (e.g. late evening in the Americas).
 */
export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Today's date as a LOCAL-timezone `YYYY-MM-DD` string, for prefilling date-input
 * defaults. See {@link formatLocalDate}.
 */
export function todayLocalDate(): string {
  return formatLocalDate(new Date());
}

/** The "Any time / Last N days" choices behind every list toolbar's time filter. */
export type TimeRange = "any" | "7d" | "30d" | "90d";

const TIME_RANGE_DAYS: Record<Exclude<TimeRange, "any">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

/**
 * True when `value` (a `YYYY-MM-DD` or full ISO date) falls inside `range`.
 *
 * Ranges count **calendar days in the viewer's timezone, inclusive of today** —
 * "Last 7 days" is today plus the previous 6 — so a record dated today always
 * matches. Parsing goes through {@link parseLocalDate}, never `new Date(iso)`,
 * so a date-only value isn't shifted a day for viewers west of UTC.
 *
 * There is no upper bound: a future-dated record (a payout entered ahead of time)
 * stays visible rather than silently vanishing. Rows with a missing or malformed
 * date are excluded from a narrowed range, and kept under `"any"`.
 */
export function withinTimeRange(value: string | null | undefined, range: TimeRange): boolean {
  if (range === "any") return true;
  const d = parseLocalDate(value);
  if (!d) return false;
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (TIME_RANGE_DAYS[range] - 1));
  return d.getTime() >= cutoff.getTime();
}

/** Part of email before @ (for compact display). */
export function emailLocalPart(email: string): string {
  const i = email.indexOf("@");
  return i === -1 ? email : email.slice(0, i);
}

/** Extract initials from fullName, fallback to email first char */
export function getInitials(fullName?: string | null, email?: string | null): string {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/);
    return parts.map((p) => p[0]).join("").toUpperCase().slice(0, 2);
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return "?";
}

/** Generate URL-friendly slug from text */
export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Normalize a user-entered website into a safe external href (adds https:// only if missing). */
export function externalHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/** Build a `tel:` href from a free-form phone string (keeps digits, +, *, #). */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+*#]/g, "")}`;
}

/** Format a number as USD with cents (e.g. 5720 → "$5,720.00"). */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Compact currency for chart axes, e.g. $3k, $1.2M. */
export function formatCurrencyCompact(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}
