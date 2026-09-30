import { z } from "zod";

/**
 * Shared email primitive. Trims surrounding whitespace, then validates format,
 * so the browser and the server enforce one identical rule. Server actions
 * additionally lower-case the parsed value for storage and case-insensitive
 * lookups. Use this everywhere an email is collected.
 */
export const emailSchema = z.string().trim().email("A valid email is required");
