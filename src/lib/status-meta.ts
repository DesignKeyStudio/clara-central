import type { invoice_status, partner_status, referral_status } from "@prisma/client";
import type { StatusTone } from "@/components/custom/status-badge";
import type { CommissionState } from "@/lib/services/partner-service";

type StatusMeta = { label: string; tone: StatusTone };

/** Status meta plus the prefix used in front of the commission boundary date. */
type CommissionStateMeta = StatusMeta & { datePrefix: string };

const PARTNER_STATUS: Record<partner_status, StatusMeta> = {
  approved: { label: "Approved", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  rejected: { label: "Rejected", tone: "destructive" },
};

// Funnel-heat dot colors: gray = new/stalled, blue = engaged,
// amber = late-stage/advancing, green = won, red = lost.
const REFERRAL_STATUS: Record<referral_status, StatusMeta> = {
  submitted: { label: "Submitted", tone: "slate" },
  contacted: { label: "Contacted", tone: "teal" },
  meeting_scheduled: { label: "Meeting Scheduled", tone: "violet" },
  proposal_sent: { label: "Proposal Sent", tone: "warning" },
  negotiating: { label: "Negotiating", tone: "terracotta" },
  deal_closed: { label: "Deal Closed", tone: "success" },
  no_response: { label: "No Response", tone: "neutral" },
  not_qualified: { label: "Not Qualified", tone: "mauve" },
  lost: { label: "Lost", tone: "destructive" },
};

const COMMISSION_STATE: Record<CommissionState, CommissionStateMeta> = {
  active: { label: "Active", tone: "success", datePrefix: "Until" },
  contract_ended: { label: "Contract Ended", tone: "warning", datePrefix: "Ended" },
  expired: { label: "Expired", tone: "neutral", datePrefix: "Expired" },
};

const INVOICE_STATUS: Record<invoice_status, StatusMeta> = {
  draft: { label: "Draft", tone: "neutral" },
  sent: { label: "Sent", tone: "warning" },
  paid: { label: "Paid", tone: "success" },
};

/** Display label + dot tone for a partner approval status. */
export function partnerStatusMeta(status: partner_status): StatusMeta {
  return PARTNER_STATUS[status];
}

/** Display label + dot tone for a referral pipeline status. */
export function referralStatusMeta(status: referral_status): StatusMeta {
  return REFERRAL_STATUS[status];
}

/** Display label, dot tone, and date prefix for a referral's commission state. */
export function commissionStateMeta(state: CommissionState): CommissionStateMeta {
  return COMMISSION_STATE[state];
}

/** Display label + dot tone for a client invoice's status. */
export function invoiceStatusMeta(status: invoice_status): StatusMeta {
  return INVOICE_STATUS[status];
}
