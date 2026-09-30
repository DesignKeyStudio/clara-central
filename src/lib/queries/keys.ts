/** React Query cache keys — centralized to avoid typos and enable targeted invalidation. */
export const queryKeys = {
  partners: ["partners"] as const,
  partner: (id: string) => ["partners", id] as const,
  invites: ["invites"] as const,
  referrals: ["referrals"] as const,
  referral: (id: string) => ["referrals", id] as const,
  payouts: ["payouts"] as const,
  payoutsSummary: ["payouts", "summary"] as const,
  dashboard: ["dashboard"] as const,
  marketing: ["marketing"] as const,
  appConfig: ["app-config"] as const,
  auditLog: (filters?: Record<string, string | undefined>) => ["audit-log", filters ?? {}] as const,
  // Partner portal — the signed-in partner's own scoped data.
  myReferrals: ["partner", "referrals"] as const,
  myReferral: (id: string) => ["partner", "referrals", id] as const,
  myPayouts: ["partner", "payouts"] as const,
  myPartnerSummary: ["partner", "summary"] as const,
  partnerMarketing: ["partner", "marketing"] as const,
  // The signed-in user's own account profile (admin or partner).
  myProfile: ["account", "profile"] as const,
} as const;
