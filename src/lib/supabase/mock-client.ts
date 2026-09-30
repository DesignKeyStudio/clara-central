/**
 * Mocked Supabase client for PROTOTYPE_MODE.
 *
 * Activated when NEXT_PUBLIC_PROTOTYPE_MODE === "true". Replaces the real Supabase
 * client surface (browser, server, admin) with an always-logged-in demo user.
 *
 * Use only for prototypes. Real auth (signup, password reset, sessions) is not
 * implemented — calls just return success.
 */

import type { SupabaseClient, User } from "@supabase/supabase-js";

/** Stable demo user — referenced by seed.ts to wire the demo user into the org. */
export const PROTOTYPE_DEMO_USER: User = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "demo@prototype.local",
  email_confirmed_at: new Date(0).toISOString(),
  phone: "",
  app_metadata: { provider: "prototype", role: "admin" },
  user_metadata: { full_name: "Demo User", name: "Demo User" },
  aud: "authenticated",
  role: "authenticated",
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
  confirmed_at: new Date(0).toISOString(),
  last_sign_in_at: new Date(0).toISOString(),
  identities: [],
  is_anonymous: false,
  factors: [],
};

/** Returns true if PROTOTYPE_MODE is active (read from `NEXT_PUBLIC_PROTOTYPE_MODE`). */
export function isPrototypeMode(): boolean {
  return process.env.NEXT_PUBLIC_PROTOTYPE_MODE === "true";
}

const noopOk = () => Promise.resolve({ error: null });
const userOk = () =>
  Promise.resolve({ data: { user: PROTOTYPE_DEMO_USER }, error: null });
const sessionOk = () =>
  Promise.resolve({
    data: {
      user: PROTOTYPE_DEMO_USER,
      session: {
        access_token: "prototype-token",
        token_type: "bearer",
        expires_in: 60 * 60 * 24 * 365,
        refresh_token: "prototype-refresh",
        user: PROTOTYPE_DEMO_USER,
      },
    },
    error: null,
  });

/**
 * Create a mocked client structurally compatible with `SupabaseClient`.
 * Only implements the auth methods used in this codebase.
 */
export function createMockClient(): SupabaseClient {
  const mock = {
    auth: {
      getUser: userOk,
      // Mirrors `getClaims()` — returns the demo user's JWT claims (used by
      // `getClaimsUser` in the getUser→getClaims hot paths).
      getClaims: () =>
        Promise.resolve({
          data: {
            claims: {
              sub: PROTOTYPE_DEMO_USER.id,
              email: PROTOTYPE_DEMO_USER.email,
              role: "authenticated",
              aud: "authenticated",
              app_metadata: PROTOTYPE_DEMO_USER.app_metadata,
              user_metadata: PROTOTYPE_DEMO_USER.user_metadata,
            },
          },
          error: null,
        }),
      getSession: () =>
        Promise.resolve({
          data: { session: { user: PROTOTYPE_DEMO_USER } },
          error: null,
        }),
      signInWithPassword: sessionOk,
      signInWithOtp: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
      verifyOtp: sessionOk,
      signUp: sessionOk,
      signOut: noopOk,
      resetPasswordForEmail: noopOk,
      updateUser: userOk,
      onAuthStateChange: (_cb: unknown) => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      admin: {
        createUser: ({ email }: { email: string }) =>
          Promise.resolve({
            data: {
              user: {
                ...PROTOTYPE_DEMO_USER,
                email: email ?? PROTOTYPE_DEMO_USER.email,
              },
            },
            error: null,
          }),
        generateLink: ({ email }: { email?: string }) =>
          Promise.resolve({
            data: {
              properties: {
                email_otp: "123456",
                hashed_token: "prototype-hashed-token",
                action_link: "",
                redirect_to: "",
                verification_type: "magiclink",
              },
              user: { ...PROTOTYPE_DEMO_USER, email: email ?? PROTOTYPE_DEMO_USER.email },
            },
            error: null,
          }),
        deleteUser: noopOk,
        listUsers: () =>
          Promise.resolve({
            data: { users: [PROTOTYPE_DEMO_USER] },
            error: null,
          }),
      },
    },
  };

  return mock as unknown as SupabaseClient;
}
