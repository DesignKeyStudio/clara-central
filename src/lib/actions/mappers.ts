import type { Decimal } from "@prisma/client/runtime/library";

/** Convert a Prisma Date to ISO string, or undefined if null */
export function toISOStringOrUndefined(date: Date | null | undefined): string | undefined {
  return date ? date.toISOString() : undefined;
}

/** Convert a Prisma Date to ISO string */
export function toISOString(date: Date): string {
  return date.toISOString();
}

/** Convert a Prisma Date to YYYY-MM-DD string (for date-only fields) */
export function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

/** Convert a Prisma Date to YYYY-MM-DD string, or undefined if null */
export function toDateStringOrUndefined(date: Date | null | undefined): string | undefined {
  return date ? date.toISOString().split("T")[0] : undefined;
}

/** Convert a Prisma Decimal to number */
export function toNumber(decimal: Decimal | null | undefined): number {
  if (decimal == null) return 0;
  return Number(decimal);
}
