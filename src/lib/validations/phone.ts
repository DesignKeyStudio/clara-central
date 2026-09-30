import { z } from "zod";

/**
 * Phone fields accept common human formatting — leading `+`, spaces, dashes,
 * dots, and parentheses — but must contain a plausible number of digits.
 * We validate the *digit count* (7–15, matching E.164's max) rather than a
 * strict national format, so international numbers are accepted without a
 * formatting library. The value is only trimmed, never rewritten, so callers
 * that inspect the raw string (e.g. the refer-a-contact "email OR phone"
 * refinement) keep seeing exactly what the user typed.
 */
const PHONE_MESSAGE = "Enter a valid phone number";

// Only phone-ish characters are allowed. (Digits + common separators.)
const PHONE_ALLOWED = /^[+()\-.\s\d]+$/;
const MIN_DIGITS = 7;
const MAX_DIGITS = 15;

/** True for an empty string or a plausibly-valid phone number. */
export function isValidPhone(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "") return true;
  if (!PHONE_ALLOWED.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, "").length;
  return digits >= MIN_DIGITS && digits <= MAX_DIGITS;
}

/**
 * Optional phone field; empty string and undefined pass through unchanged.
 * A non-empty value must use only phone characters and carry 7–15 digits.
 * Modeled on `optionalUrlSchema` in ./url.ts.
 */
export const optionalPhoneSchema = z
  .string()
  .trim()
  .refine(isValidPhone, PHONE_MESSAGE)
  .optional();

/**
 * Strict US phone validation, used where we want a single, well-formed national
 * number rather than the loose international rule above (e.g. the admin profile).
 * Accepts exactly 10 digits, or 11 digits when the extra one is a leading `1`
 * country code. Empty string passes (the field is optional; the action maps
 * "" → null). Pair with `formatUsPhone` for the input mask.
 */
const US_PHONE_MESSAGE = "Enter a valid US phone number";

export function isValidUsPhone(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "") return true;
  if (!PHONE_ALLOWED.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
}

export const optionalUsPhoneSchema = z
  .string()
  .trim()
  .refine(isValidUsPhone, US_PHONE_MESSAGE)
  .optional();

/**
 * Progressive US phone-number mask for a controlled input. Strips a leading `1`
 * country code, keeps at most 10 national digits, and formats them as
 * `(555) 555-5555`, revealing punctuation as the user types. Non-digit
 * characters are ignored, so paste/format-on-blur both work. An empty (or
 * digit-less) input returns "" so the field can clear cleanly.
 */
export function formatUsPhone(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  digits = digits.slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
