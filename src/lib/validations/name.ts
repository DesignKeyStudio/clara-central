import { z } from "zod";

/**
 * Shared person-name primitive. Every full-name / contact-name field trims,
 * requires a value, and caps length at `MAX_NAME_LENGTH`. Pass the field's label
 * so the "required" message reads naturally (e.g. "Full name is required").
 */
export const MAX_NAME_LENGTH = 250;

export function personNameSchema(label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(MAX_NAME_LENGTH, "Keep the name under 250 characters");
}
