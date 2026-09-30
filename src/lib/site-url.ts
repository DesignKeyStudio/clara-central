import { headers } from "next/headers";

/**
 * Absolute origin for app-generated links in emails and redirects: the configured
 * `NEXT_PUBLIC_SITE_URL` when set, otherwise derived from the incoming request
 * headers (honoring `x-forwarded-*` behind a proxy). Server-only — it reads
 * request headers, so call it from server actions / route handlers, never a
 * client component. Shared by the partner-invite, approval, payout, referral,
 * and invoice emails so every transactional link points at the same origin.
 */
export async function resolveOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
