import { typeid } from "typeid-js";

/**
 * TypeID strategy for Clara Central domain tables.
 *
 * Domain primary keys are prefixed, time-ordered TypeIDs stored as `text`
 * (e.g. `partner_01kt99bd57eh1v4knnvbx6jv52`). The suffix is a base32-encoded
 * UUIDv7, so inserts stay roughly sequential and avoid the index fragmentation
 * of random UUIDv4 keys.
 *
 * Keep this module free of `@/` path-alias imports — the Prisma seed imports it
 * via a relative path under `tsx`, which does not resolve tsconfig aliases.
 */

/**
 * Prisma model name → TypeID prefix.
 *
 * Models absent from this map manage their own ids and are intentionally left
 * out of the auto-id Prisma extension:
 *   - `UserProfile` — id is the Supabase `auth.users` uuid (supplied on create)
 *   - `ActivityLog` — id is a db-generated uuid (`gen_random_uuid()`)
 */
export const MODEL_ID_PREFIXES: Record<string, string> = {
  Organization: "org",
  OrganizationMembership: "orgmem",
  Partner: "partner",
  Referral: "ref",
  Invoice: "invoice",
  Payout: "payout",
  PartnerInvite: "invite",
  MarketingSection: "sec",
  MarketingItem: "item",
  AppConfig: "cfg",
};

/** Generate a new prefixed TypeID string, e.g. `newId("partner")` → `partner_01kt…`. */
export function newId(prefix: string): string {
  return typeid(prefix).toString();
}

/** True if `value` is a TypeID carrying the given prefix. */
export function isId(value: unknown, prefix: string): value is string {
  return typeof value === "string" && value.startsWith(`${prefix}_`);
}

/**
 * URL-safe slug — lowercase, non-alphanumerics collapsed to a single dash, trimmed.
 * Kept local (mirrors `utils.slugify`) so this module stays free of `@/` imports
 * for the alias-less Prisma seed.
 */
function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-+|-+$)/g, "");
}

/**
 * Public, hard-to-guess referral code for a partner's shareable link
 * (`/r/{code}`): a name slug + a random token from a fresh TypeID suffix. The
 * suffix is base32-encoded UUIDv7 whose trailing chars are effectively random, so
 * the code reads cleanly yet isn't enumerable. Uniqueness is enforced by
 * `Partner.referralCode @unique`.
 */
export function newReferralCode(fullName: string): string {
  const base = slugify(fullName).slice(0, 40) || "partner";
  const token = typeid("t").toString().split("_")[1].slice(-10);
  return `${base}-${token}`;
}
