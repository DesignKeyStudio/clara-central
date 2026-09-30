/**
 * Lightweight in-memory rate limiter (best-effort).
 *
 * Blunts enumeration / code-spam on public endpoints (e.g. the partner OTP
 * request action). State is per-process and NOT shared across serverless
 * instances — this is a speed bump, not a guarantee. Swap for a durable store
 * (Upstash/Redis) when the broader rate-limiting work lands.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Drop expired buckets once the map grows past this size, to bound memory. */
const PRUNE_THRESHOLD = 5_000;

function prune(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = { allowed: boolean; retryAfterMs: number };

/**
 * Fixed-window limiter. Allows up to `limit` hits per `windowMs` for a given
 * `key`; the window resets `windowMs` after the first hit in it.
 */
export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= PRUNE_THRESHOLD) prune(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (existing.count >= limit) {
    return { allowed: false, retryAfterMs: existing.resetAt - now };
  }

  existing.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}
