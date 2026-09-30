import { createClient } from "@supabase/supabase-js";
import { createMockClient, isPrototypeMode } from "./mock-client";

/**
 * Server-only Supabase client with service role key.
 * Bypasses RLS — use ONLY in Server Actions / API routes.
 *
 * In PROTOTYPE_MODE, returns a mocked client (no service role needed).
 */
export function createAdminClient() {
  if (isPrototypeMode()) {
    return createMockClient();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
