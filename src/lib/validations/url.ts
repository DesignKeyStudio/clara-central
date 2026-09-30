import { z } from "zod";

/**
 * Website / URL fields accept a bare host so users don't have to type a scheme:
 * `example.com` is normalized to `https://example.com` before validation (and
 * before persisting, so the value renders as an absolute `<a href>` rather than
 * a broken relative link). A value that already carries an explicit scheme
 * (`http://`, `https://`, `mailto:`, …) is left untouched.
 */
export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  // Leave anything with an explicit scheme alone; otherwise assume https.
  if (/^[a-z][a-z\d+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const URL_MESSAGE = "Enter a valid URL (e.g. example.com)";

/** Required URL field; a bare host is normalized to https:// before validation. */
export const urlSchema = z
  .string()
  .trim()
  .transform(normalizeUrl)
  .pipe(z.string().url(URL_MESSAGE));

/** Optional URL field; empty string and undefined pass through unchanged. */
export const optionalUrlSchema = z
  .string()
  .trim()
  .transform(normalizeUrl)
  .pipe(z.union([z.string().url(URL_MESSAGE), z.literal("")]))
  .optional();
