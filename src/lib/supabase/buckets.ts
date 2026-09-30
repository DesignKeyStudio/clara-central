/**
 * Storage bucket names. Client-safe (no service-role imports) so both the
 * server storage module and the browser upload step can share one source.
 */
export const MARKETING_BUCKET = "marketing";

/** Public bucket for partner profile pictures — objects are served via stable public URLs. */
export const AVATAR_BUCKET = "avatars";
