import { Resend } from "resend";
import { isPrototypeMode } from "@/lib/supabase/mock-client";

/**
 * Resend integration — external I/O, so it lives outside `src/lib/services/`
 * (those are pure Prisma, no Next.js/Supabase). Called from the action layer,
 * mirroring how `src/lib/supabase/marketing-storage.ts` is wired.
 */

/**
 * Default sender — Resend's shared test domain. It only delivers to the Resend
 * account owner's address until a real domain is verified. Override with
 * `EMAIL_FROM` (e.g. "Clara Central <no-reply@yourdomain.com>") in production —
 * no code change needed.
 */
const DEFAULT_FROM = `${process.env.NEXT_PUBLIC_BRAND_NAME ?? "Clara Central"} <onboarding@resend.dev>`;

let client: Resend | null = null;

/**
 * Memoized Resend client, or `null` when email shouldn't actually send:
 * prototype mode (ephemeral demo DB, no real partners) or a missing
 * `RESEND_API_KEY` (local dev without the key). Callers treat `null` as
 * "skip sending", never as an error.
 */
export function getResend(): Resend | null {
  if (isPrototypeMode()) return null;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new Resend(apiKey);
  return client;
}

/** The "From" header, configurable per environment via `EMAIL_FROM`. */
export function resolveFrom(): string {
  return process.env.EMAIL_FROM ?? DEFAULT_FROM;
}
