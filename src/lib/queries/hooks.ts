"use client";

// React Query hooks live here, each wrapping a server action from
// `src/lib/actions/*` and keyed via `./keys`. Re-introduced per feature
// during the app-layer build-out.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { todayLocalDate } from "@/lib/utils";
import {
  getMyProfileAction,
  prepareAvatarUploadAction,
  removeMyAvatarAction,
  setMyAvatarAction,
  updateMyProfileAction,
  type MyProfile,
} from "@/app/actions/account";
import type { UpdatePartnerProfileFormData } from "@/lib/validations/partner";
import type { UpdateAdminProfileFormData } from "@/lib/validations/account";
import {
  deletePartnerAction,
  getInvitesAction,
  getPartnerAction,
  getPartnersAction,
  invitePartnerAction,
  preparePartnerAvatarUploadAction,
  removePartnerAvatarAction,
  resendInviteAction,
  revokeInviteAction,
  setPartnerAvatarAction,
  setPartnerStatusAction,
  updatePartnerAction,
} from "@/app/actions/partners";
import type { PartnerDetail, PartnerListRow } from "@/lib/services/partner-service";
import type { InviteListRow } from "@/lib/services/invite-service";
import type { InvitePartnerFormData, UpdatePartnerFormData } from "@/lib/validations/partner";
import type { invoice_status, referral_status } from "@prisma/client";
import {
  addInvoiceAction,
  deleteInvoiceAction,
  deleteReferralAction,
  getReferralAction,
  getReferralsAction,
  setContractEndedAction,
  setInvoiceStatusAction,
  updateInvoiceAction,
  updateReferralStatusAction,
} from "@/app/actions/referrals";
import type { ReferralDetail, ReferralListRow } from "@/lib/services/referral-service";
import type { CreateInvoiceFormData } from "@/lib/validations/referral";
import {
  deletePayoutAction,
  getPayoutsAction,
  getPayoutsSummaryAction,
  recordPayoutAction,
  updatePayoutAction,
} from "@/app/actions/payouts";
import type { RecordPayoutFormData } from "@/lib/validations/payout";
import { getAppConfigAction, updateAppConfigAction } from "@/app/actions/app-config";
import { getDashboardAction } from "@/app/actions/dashboard";
import type { DashboardData } from "@/lib/services/dashboard-service";
import { getActivityLogAction } from "@/app/actions/audit-log";
import type { ActivityLogFilters, ActivityLogRow } from "@/lib/services/activity-service";
import type { AppConfigValues } from "@/lib/services/app-config-service";
import type { AppConfigFormData } from "@/lib/validations/app-config";
import {
  createReferralAction,
  deleteMyReferralAction,
  getMyPartnerSummaryAction,
  getMyPayoutsAction,
  getMyReferralAction,
  getMyReferralsAction,
} from "@/app/actions/partner-portal";
import type { PartnerReferralListRow } from "@/lib/services/referral-service";
import type {
  CommissionSummary,
  PartnerPayoutRow,
  PayoutListRow,
} from "@/lib/services/payout-service";
import type { PartnerSummary } from "@/lib/services/partner-service";
import type { ReferContactFormData } from "@/lib/validations/referral";
import {
  createLinkItemAction,
  createSectionAction,
  deleteItemAction,
  deleteSectionAction,
  finalizeFileItemAction,
  getMarketingAction,
  getMarketingDownloadUrlAction,
  getMarketingPreviewUrlAction,
  getPartnerMarketingAction,
  prepareCoverUploadAction,
  prepareFileUploadAction,
  renameSectionAction,
  reorderItemsAction,
  reorderSectionsAction,
  replaceFileItemAction,
  setItemCoverAction,
  updateItemAction,
  type EnrichedMarketingSection,
} from "@/app/actions/marketing";
import { createClient } from "@/lib/supabase/client";
import { AVATAR_BUCKET, MARKETING_BUCKET } from "@/lib/supabase/buckets";
import type { CreateSectionFormData, LinkItemFormData } from "@/lib/validations/marketing";
import { queryKeys } from "./keys";

/**
 * Error thrown by a mutation when a server action returns `{ error, field }`, so
 * the calling form can bind the message inline to a specific field (e.g. a
 * duplicate-email error under the email input) and fall back to a toast otherwise.
 */
export class ActionFieldError extends Error {
  field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.name = "ActionFieldError";
    this.field = field;
  }
}

/**
 * Partner list for the admin Partners page — real data via the `getPartnersAction`
 * server action (admin-gated). The UI and query key are unchanged.
 */
export function usePartners() {
  return useQuery<PartnerListRow[]>({
    queryKey: queryKeys.partners,
    queryFn: () => getPartnersAction(),
  });
}

/**
 * Single partner detail for `/admin/partners/[id]` — real data via the
 * `getPartnerAction(id)` server action. Resolves to null when not found.
 */
export function usePartner(id: string, options?: { enabled?: boolean }) {
  return useQuery<PartnerDetail | null>({
    queryKey: queryKeys.partner(id),
    queryFn: () => getPartnerAction(id),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Every referral across all partners for the admin Referrals page — real data via
 * the `getReferralsAction` server action (admin-gated). The UI and query key are
 * unchanged.
 */
export function useReferrals() {
  return useQuery<ReferralListRow[]>({
    queryKey: queryKeys.referrals,
    queryFn: () => getReferralsAction(),
  });
}

/**
 * Single referral detail for `/admin/referrals/[id]` — real data via the
 * `getReferralAction(id)` server action. Resolves to null when not found.
 */
export function useReferral(id: string) {
  return useQuery<ReferralDetail | null>({
    queryKey: queryKeys.referral(id),
    queryFn: () => getReferralAction(id),
  });
}

/**
 * Shared cache buster for referral mutations: the referral detail + list, plus
 * the owning partner + partners list (partner commission KPIs derive from this
 * referral's invoices and commission window).
 */
function useInvalidateReferral(referralId: string, partnerId: string) {
  const queryClient = useQueryClient();
  return () => {
    for (const key of [
      queryKeys.referral(referralId),
      queryKeys.referrals,
      queryKeys.partner(partnerId),
      queryKeys.partners,
      // Invoice changes shift platform-wide earned commission.
      queryKeys.payoutsSummary,
    ]) {
      queryClient.invalidateQueries({ queryKey: key });
    }
  };
}

/** Change a referral's pipeline status. */
export function useUpdateReferralStatus(referralId: string, partnerId: string) {
  const invalidate = useInvalidateReferral(referralId, partnerId);
  return useMutation({
    mutationFn: async (status: referral_status) => {
      const res = await updateReferralStatusAction(referralId, status);
      if ("error" in res) throw new Error(res.error);
      return res.referral;
    },
    onSuccess: () => invalidate(),
  });
}

/** Mark a referral's contract ended (today) or reopen it. */
export function useSetContractEnded(referralId: string, partnerId: string) {
  const invalidate = useInvalidateReferral(referralId, partnerId);
  return useMutation({
    mutationFn: async (ended: boolean) => {
      // Send the admin's LOCAL date so the contract-end lands on "today" in their
      // timezone, not the UTC date a server-side `new Date()` would record.
      const res = await setContractEndedAction(referralId, ended, ended ? todayLocalDate() : undefined);
      if ("error" in res) throw new Error(res.error);
      return res.referral;
    },
    onSuccess: () => invalidate(),
  });
}

/** Create a client invoice on a referral. */
export function useAddInvoice(referralId: string, partnerId: string) {
  const invalidate = useInvalidateReferral(referralId, partnerId);
  return useMutation({
    mutationFn: async (input: CreateInvoiceFormData) => {
      const res = await addInvoiceAction(referralId, input);
      if ("error" in res) throw new Error(res.error);
      return res.referral;
    },
    onSuccess: () => invalidate(),
  });
}

/**
 * Change an existing invoice's status (inline, from the invoices table). When moving
 * to `paid`, an optional `paidDate` (YYYY-MM-DD) can be supplied — the inline control
 * prompts for it (INV-4); other transitions omit it.
 */
export function useSetInvoiceStatus(referralId: string, partnerId: string) {
  const invalidate = useInvalidateReferral(referralId, partnerId);
  return useMutation({
    mutationFn: async ({
      invoiceId,
      status,
      paidDate,
    }: {
      invoiceId: string;
      status: invoice_status;
      paidDate?: string;
    }) => {
      const res = await setInvoiceStatusAction(invoiceId, status, paidDate);
      if ("error" in res) throw new Error(res.error);
      return res.referral;
    },
    onSuccess: () => invalidate(),
  });
}

/** Edit an existing invoice (amount, status, dates, notes, number). */
export function useUpdateInvoice(referralId: string, partnerId: string) {
  const invalidate = useInvalidateReferral(referralId, partnerId);
  return useMutation({
    mutationFn: async ({ invoiceId, input }: { invoiceId: string; input: CreateInvoiceFormData }) => {
      const res = await updateInvoiceAction(invoiceId, input);
      if ("error" in res) throw new Error(res.error);
      return res.referral;
    },
    onSuccess: () => invalidate(),
  });
}

/** Delete an invoice from a referral's ledger. */
export function useDeleteInvoice(referralId: string, partnerId: string) {
  const invalidate = useInvalidateReferral(referralId, partnerId);
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const res = await deleteInvoiceAction(invoiceId);
      if ("error" in res) throw new Error(res.error);
      return res.referral;
    },
    onSuccess: () => invalidate(),
  });
}

/**
 * Permanently delete a referral (cascades to its invoices; payouts keep their
 * partner attribution). Invalidates the referrals list, the owning partner +
 * partners list (their commission KPIs derived from this referral are gone), the
 * payouts (+ summary), and the dashboard.
 */
export function useDeleteReferral(referralId: string, partnerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await deleteReferralAction(referralId);
      if ("error" in res) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      for (const key of [
        queryKeys.referrals,
        queryKeys.partner(partnerId),
        queryKeys.partners,
        queryKeys.payouts,
        queryKeys.payoutsSummary,
        queryKeys.dashboard,
      ]) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}

/**
 * Update a partner's details (the first mutation in the app). On success,
 * invalidates the partner detail + list, and the referrals list/detail too —
 * referral commission now derives from the partner's single rate.
 */
export function useUpdatePartner(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdatePartnerFormData) => {
      const res = await updatePartnerAction(id, input);
      if ("error" in res) throw new ActionFieldError(res.error, res.field);
      return res.partner;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partner(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.partners });
      queryClient.invalidateQueries({ queryKey: queryKeys.referrals });
    },
  });
}

/**
 * Create a partner invitation. Returns `{ link, email, emailed }` so the dialog
 * can show the copyable onboarding link and report whether the email was sent.
 * Invalidates the partners list (the invite has no partner row yet, but keeps
 * the page fresh for when onboarding completes).
 */
export function useInvitePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: InvitePartnerFormData) => {
      const res = await invitePartnerAction(input);
      if ("error" in res) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners });
      queryClient.invalidateQueries({ queryKey: queryKeys.invites });
    },
  });
}

/** Outstanding (pending) partner invitations for the admin Invitations section. */
export function useInvites() {
  return useQuery<InviteListRow[]>({
    queryKey: queryKeys.invites,
    queryFn: () => getInvitesAction(),
  });
}

/** Revoke a pending invitation. Refreshes the invitations list on success. */
export function useRevokeInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (inviteId: string) => {
      const res = await revokeInviteAction(inviteId);
      if ("error" in res) throw new Error(res.error);
      return res;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.invites }),
  });
}

/**
 * Resend a pending invitation (refresh expiry + re-send email). Returns the
 * refreshed link/expiry; refreshes the invitations list on success.
 */
export function useResendInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (inviteId: string) => {
      const res = await resendInviteAction(inviteId);
      if ("error" in res) throw new Error(res.error);
      return res;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.invites }),
  });
}

/** Approve / reject a partner from the list Actions column. */
export function useSetPartnerStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const res = await setPartnerStatusAction(id, status);
      if ("error" in res) throw new Error(res.error);
      return res;
    },
    onSuccess: (_res, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners });
      queryClient.invalidateQueries({ queryKey: queryKeys.partner(id) });
    },
  });
}

/**
 * Permanently delete a partner (cascades to their referrals, invoices, and
 * payouts). Invalidates every list those rows feed: partners, referrals, payouts
 * (+ summary), and the dashboard KPIs.
 */
export function useDeletePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await deletePartnerAction(id);
      if ("error" in res) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      for (const key of [
        queryKeys.partners,
        queryKeys.referrals,
        queryKeys.payouts,
        queryKeys.payoutsSummary,
        queryKeys.dashboard,
      ]) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}

/** All commission payouts for the admin Payouts page — real data via `getPayoutsAction`. */
export function usePayouts() {
  return useQuery<PayoutListRow[]>({
    queryKey: queryKeys.payouts,
    queryFn: () => getPayoutsAction(),
  });
}

/** Platform-wide commission earned / paid / outstanding for the admin Payouts KPIs. */
export function usePayoutsSummary() {
  return useQuery<CommissionSummary>({
    queryKey: queryKeys.payoutsSummary,
    queryFn: () => getPayoutsSummaryAction(),
  });
}

/**
 * Shared cache buster for payout mutations: the payouts list + summary, the partner
 * (commission paid/owed KPIs) + partners list, the partner-portal payouts/summary,
 * and — when referral-scoped — that referral + the referrals list.
 */
function useInvalidatePayout(partnerId: string, referralId?: string | null) {
  const queryClient = useQueryClient();
  return () => {
    for (const key of [
      queryKeys.payouts,
      queryKeys.payoutsSummary,
      queryKeys.partner(partnerId),
      queryKeys.partners,
      queryKeys.myPayouts,
      queryKeys.myPartnerSummary,
    ]) {
      queryClient.invalidateQueries({ queryKey: key });
    }
    if (referralId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.referral(referralId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.referrals });
    }
  };
}

/**
 * Record a commission payout to a partner. Partner-level by default; pass a
 * `referralId` for a referral-level payment.
 */
export function useRecordPayout(partnerId: string, referralId?: string) {
  const invalidate = useInvalidatePayout(partnerId, referralId ?? null);
  return useMutation({
    mutationFn: async (input: RecordPayoutFormData) => {
      const res = await recordPayoutAction(partnerId, referralId ?? null, input);
      if ("error" in res) throw new Error(res.error);
      return res;
    },
    onSuccess: () => invalidate(),
  });
}

/** Edit an existing payout's amount/notes (admin Payouts list). */
export function useUpdatePayout(partnerId: string, referralId?: string | null) {
  const invalidate = useInvalidatePayout(partnerId, referralId ?? null);
  return useMutation({
    mutationFn: async ({ payoutId, input }: { payoutId: string; input: RecordPayoutFormData }) => {
      const res = await updatePayoutAction(payoutId, input);
      if ("error" in res) throw new Error(res.error);
      return res;
    },
    onSuccess: () => invalidate(),
  });
}

/** Delete a payout (admin Payouts list). */
export function useDeletePayout(partnerId: string, referralId?: string | null) {
  const invalidate = useInvalidatePayout(partnerId, referralId ?? null);
  return useMutation({
    mutationFn: async (payoutId: string) => {
      const res = await deletePayoutAction(payoutId);
      if ("error" in res) throw new Error(res.error);
      return res;
    },
    onSuccess: () => invalidate(),
  });
}

// ── Dashboard ──

/** Aggregated platform metrics for the `/admin` overview dashboard (admin-gated). */
export function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: queryKeys.dashboard,
    queryFn: () => getDashboardAction(),
  });
}

// ── Audit log ──

/** Admin audit-log viewer — newest activity events, optionally filtered. */
export function useActivityLog(filters?: ActivityLogFilters) {
  return useQuery<ActivityLogRow[]>({
    queryKey: queryKeys.auditLog(filters as Record<string, string | undefined> | undefined),
    queryFn: () => getActivityLogAction(filters),
  });
}

// ── Platform settings ──

/** Platform commission settings (admin Settings page + invite-dialog prefill). */
export function useAppConfig() {
  return useQuery<AppConfigValues>({
    queryKey: queryKeys.appConfig,
    queryFn: () => getAppConfigAction(),
  });
}

/**
 * Update platform settings. Invalidates the config plus the partners/referrals
 * lists, whose commission windows derive from `commissionValidMonths`.
 */
export function useUpdateAppConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AppConfigFormData) => {
      const res = await updateAppConfigAction(input);
      if ("error" in res) throw new Error(res.error);
      return res.config;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appConfig });
      queryClient.invalidateQueries({ queryKey: queryKeys.partners });
      queryClient.invalidateQueries({ queryKey: queryKeys.referrals });
    },
  });
}

// ── Partner portal ──

/** The signed-in partner's own referrals (their "My Referrals" page). */
export function useMyReferrals() {
  return useQuery<PartnerReferralListRow[]>({
    queryKey: queryKeys.myReferrals,
    queryFn: () => getMyReferralsAction(),
  });
}

/** One of the signed-in partner's own referrals, by id (partner referral detail). */
export function useMyReferral(id: string) {
  return useQuery<ReferralDetail | null>({
    queryKey: queryKeys.myReferral(id),
    queryFn: () => getMyReferralAction(id),
  });
}

/** The signed-in partner's own payouts (their "Payouts" page). */
export function useMyPayouts() {
  return useQuery<PartnerPayoutRow[]>({
    queryKey: queryKeys.myPayouts,
    queryFn: () => getMyPayoutsAction(),
  });
}

/** The signed-in partner's name + commission rate (header subtitle, refer modal). */
export function useMyPartnerSummary() {
  return useQuery<PartnerSummary | null>({
    queryKey: queryKeys.myPartnerSummary,
    queryFn: () => getMyPartnerSummaryAction(),
  });
}

/** The signed-in user's own account profile (admin identity or partner card). */
export function useMyProfile() {
  return useQuery<MyProfile>({
    queryKey: queryKeys.myProfile,
    queryFn: () => getMyProfileAction(),
  });
}

/**
 * Save the signed-in user's own profile. On success, refreshes the cached profile,
 * the partner summary (name/company shown in the portal header), and calls
 * `router.refresh()` so the server-rendered sidebar name updates immediately.
 */
export function useUpdateMyProfile() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: async (input: UpdatePartnerProfileFormData | UpdateAdminProfileFormData) => {
      const res = await updateMyProfileAction(input);
      if ("error" in res) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myProfile });
      queryClient.invalidateQueries({ queryKey: queryKeys.myPartnerSummary });
      router.refresh();
    },
  });
}

/**
 * Upload a profile picture straight to the public `avatars` bucket via a signed
 * URL (the browser uploads the bytes; the server never touches the blob), then
 * persist its public URL. Shared by the partner + admin avatar mutations.
 */
async function uploadToAvatarBucket(path: string, token: string, file: File): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .uploadToSignedUrl(path, token, file, { contentType: file.type || undefined });
  if (error) throw new Error(error.message);
}

/** The signed-in partner sets their own profile picture (prepare → upload → set). */
export function useUpdateMyAvatar() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: async (file: File) => {
      const prep = await prepareAvatarUploadAction({ fileName: file.name, size: file.size });
      if ("error" in prep) throw new Error(prep.error);
      await uploadToAvatarBucket(prep.path, prep.token, file);
      const res = await setMyAvatarAction(prep.path);
      if ("error" in res) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myProfile });
      router.refresh();
    },
  });
}

/** The signed-in partner removes their own profile picture. */
export function useRemoveMyAvatar() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: async () => {
      const res = await removeMyAvatarAction();
      if ("error" in res) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myProfile });
      router.refresh();
    },
  });
}

/** Admin sets a partner's profile picture (moderation). Invalidates that partner + the list. */
export function useSetPartnerAvatar(partnerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const prep = await preparePartnerAvatarUploadAction(partnerId, {
        fileName: file.name,
        size: file.size,
      });
      if ("error" in prep) throw new Error(prep.error);
      await uploadToAvatarBucket(prep.path, prep.token, file);
      const res = await setPartnerAvatarAction(partnerId, prep.path);
      if ("error" in res) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partner(partnerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.partners });
    },
  });
}

/** Admin removes a partner's profile picture (moderation). */
export function useRemovePartnerAvatar(partnerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await removePartnerAvatarAction(partnerId);
      if ("error" in res) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partner(partnerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.partners });
    },
  });
}

/** Submit a new referral; invalidates the partner's referrals list on success. */
export function useCreateReferral() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReferContactFormData) => {
      const res = await createReferralAction(input);
      if ("error" in res) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myReferrals });
      // Referral count + conversions on the My Referrals KPIs derive from the summary.
      queryClient.invalidateQueries({ queryKey: queryKeys.myPartnerSummary });
    },
  });
}

/**
 * Delete one of the signed-in partner's own referrals (allowed only while it's in
 * the Submitted stage; enforced server-side). Invalidates the partner's referrals
 * list + summary KPIs.
 */
export function useDeleteMyReferral() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (referralId: string) => {
      const res = await deleteMyReferralAction(referralId);
      if ("error" in res) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myReferrals });
      queryClient.invalidateQueries({ queryKey: queryKeys.myPartnerSummary });
    },
  });
}

/**
 * Marketing materials (sections + items) for the admin Marketing page — real
 * data via the admin-gated `getMarketingAction`. The query key is unchanged.
 */
export function useMarketing() {
  return useQuery<EnrichedMarketingSection[]>({
    queryKey: queryKeys.marketing,
    queryFn: () => getMarketingAction(),
  });
}

/** Imperative: mint a short-lived signed download URL for a file item (never cached). */
export async function fetchMarketingDownloadUrl(itemId: string): Promise<string> {
  const res = await getMarketingDownloadUrlAction(itemId);
  if ("error" in res) throw new Error(res.error);
  return res.url;
}

/**
 * Read-only marketing library for the partner page — same org-wide data as
 * `useMarketing`, enriched server-side with inline thumbnail URLs + a
 * `previewable` flag. Partner-scoped query key.
 */
export function usePartnerMarketing() {
  return useQuery<EnrichedMarketingSection[]>({
    queryKey: queryKeys.partnerMarketing,
    queryFn: () => getPartnerMarketingAction(),
  });
}

/** Imperative: mint a short-lived INLINE preview URL (image/PDF) — never cached. */
export async function fetchMarketingPreviewUrl(itemId: string): Promise<string> {
  const res = await getMarketingPreviewUrlAction(itemId);
  if ("error" in res) throw new Error(res.error);
  return res.url;
}

/** Shared cache buster — every marketing mutation invalidates the one list query. */
function useInvalidateMarketing() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.marketing });
}

// ── Section mutations ──

export function useCreateSection() {
  const invalidate = useInvalidateMarketing();
  return useMutation({
    mutationFn: async (input: CreateSectionFormData) => {
      const res = await createSectionAction(input);
      if ("error" in res) throw new Error(res.error);
      return res.section;
    },
    onSuccess: () => invalidate(),
  });
}

export function useRenameSection() {
  const invalidate = useInvalidateMarketing();
  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const res = await renameSectionAction(id, { title });
      if ("error" in res) throw new Error(res.error);
      return res.section;
    },
    onSuccess: () => invalidate(),
  });
}

export function useDeleteSection() {
  const invalidate = useInvalidateMarketing();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteSectionAction(id);
      if ("error" in res) throw new Error(res.error);
      return res;
    },
    onSuccess: () => invalidate(),
  });
}

export function useReorderSections() {
  const invalidate = useInvalidateMarketing();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const res = await reorderSectionsAction({ orderedIds });
      if ("error" in res) throw new Error(res.error);
      return res;
    },
    onSuccess: () => invalidate(),
  });
}

// ── Item mutations ──

/**
 * Upload a cover image straight to Storage via a signed URL (mirrors the file
 * upload flow) and resolve to its server-derived storage path. Shared by the
 * create/edit cover flows.
 */
async function uploadCover(sectionId: string, file: File): Promise<string> {
  const prep = await prepareCoverUploadAction({
    sectionId,
    fileName: file.name,
    size: file.size,
  });
  if ("error" in prep) throw new Error(prep.error);

  const supabase = createClient();
  const { error: uploadError } = await supabase.storage
    .from(MARKETING_BUCKET)
    .uploadToSignedUrl(prep.path, prep.token, file, {
      contentType: file.type || undefined,
    });
  if (uploadError) throw new Error(uploadError.message);
  return prep.path;
}

export function useCreateLinkItem() {
  const invalidate = useInvalidateMarketing();
  return useMutation({
    mutationFn: async ({
      cover,
      coverHidden,
      ...input
    }: LinkItemFormData & { sectionId: string; cover?: File | null; coverHidden?: boolean }) => {
      const coverPath = cover ? await uploadCover(input.sectionId, cover) : undefined;
      const res = await createLinkItemAction({ ...input, coverPath, coverHidden });
      if ("error" in res) throw new Error(res.error);
      return res.item;
    },
    onSuccess: () => invalidate(),
  });
}

/**
 * Create a file item via the signed-upload flow: prepare a single-use URL →
 * upload the bytes straight to Supabase Storage from the browser → finalize the
 * DB row. Keeps the 50 MB blob out of the Next server entirely.
 */
export function useCreateFileItem() {
  const invalidate = useInvalidateMarketing();
  return useMutation({
    mutationFn: async (vars: {
      sectionId: string;
      file: File;
      name: string;
      description?: string;
      cover?: File | null;
      coverHidden?: boolean;
    }) => {
      const prep = await prepareFileUploadAction({
        sectionId: vars.sectionId,
        fileName: vars.file.name,
        size: vars.file.size,
      });
      if ("error" in prep) throw new Error(prep.error);

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(MARKETING_BUCKET)
        .uploadToSignedUrl(prep.path, prep.token, vars.file, {
          contentType: vars.file.type || undefined,
        });
      if (uploadError) throw new Error(uploadError.message);

      const coverPath = vars.cover ? await uploadCover(vars.sectionId, vars.cover) : undefined;

      const res = await finalizeFileItemAction({
        sectionId: vars.sectionId,
        name: vars.name,
        description: vars.description,
        fileName: vars.file.name,
        path: prep.path,
        coverPath,
        coverHidden: vars.coverHidden,
      });
      if ("error" in res) throw new Error(res.error);
      return res.item;
    },
    onSuccess: () => invalidate(),
  });
}

/**
 * Set or clear an item's cover image. Pass a `file` to upload + set a new cover;
 * pass `file: null` to remove the current one. Used by the edit dialogs.
 */
export function useSetItemCover() {
  const invalidate = useInvalidateMarketing();
  return useMutation({
    mutationFn: async (vars: { id: string; sectionId: string; file: File | null }) => {
      const coverPath = vars.file ? await uploadCover(vars.sectionId, vars.file) : null;
      const res = await setItemCoverAction(vars.id, { coverPath });
      if ("error" in res) throw new Error(res.error);
      return res.item;
    },
    onSuccess: () => invalidate(),
  });
}

export function useUpdateItem() {
  const invalidate = useInvalidateMarketing();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: { name: string; description?: string; url?: string };
    }) => {
      const res = await updateItemAction(id, input);
      if ("error" in res) throw new Error(res.error);
      return res.item;
    },
    onSuccess: () => invalidate(),
  });
}

/**
 * Replace the file on a file item (MKT-3) — same signed-upload flow as
 * `useCreateFileItem`, ending in `replaceFileItemAction` which repoints the row
 * and purges the old blob.
 */
export function useReplaceFileItem() {
  const invalidate = useInvalidateMarketing();
  return useMutation({
    mutationFn: async (vars: { id: string; sectionId: string; file: File }) => {
      const prep = await prepareFileUploadAction({
        sectionId: vars.sectionId,
        fileName: vars.file.name,
        size: vars.file.size,
      });
      if ("error" in prep) throw new Error(prep.error);

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(MARKETING_BUCKET)
        .uploadToSignedUrl(prep.path, prep.token, vars.file, {
          contentType: vars.file.type || undefined,
        });
      if (uploadError) throw new Error(uploadError.message);

      const res = await replaceFileItemAction(vars.id, {
        sectionId: vars.sectionId,
        fileName: vars.file.name,
        path: prep.path,
      });
      if ("error" in res) throw new Error(res.error);
      return res.item;
    },
    onSuccess: () => invalidate(),
  });
}

export function useDeleteItem() {
  const invalidate = useInvalidateMarketing();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteItemAction(id);
      if ("error" in res) throw new Error(res.error);
      return res;
    },
    onSuccess: () => invalidate(),
  });
}

export function useReorderItems() {
  const invalidate = useInvalidateMarketing();
  return useMutation({
    mutationFn: async ({ sectionId, orderedIds }: { sectionId: string; orderedIds: string[] }) => {
      const res = await reorderItemsAction({ sectionId, orderedIds });
      if ("error" in res) throw new Error(res.error);
      return res;
    },
    onSuccess: () => invalidate(),
  });
}
