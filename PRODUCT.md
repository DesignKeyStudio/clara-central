# PRODUCT.md

> A referral management system where past clients refer new business and earn a rate-based share of the payments their referrals generate.

## What it is

Clara Central lets clients who have already worked with the company (ordered project creation, landing pages, and similar engagements) refer new prospects through unique invitation links. When a referral converts into a signed contract, the referring partner earns a commission — a percentage of the client's payments, set by that partner's rate.

The system tracks each referral from invitation link through to contract conversion, calculates commission on every payment received against a contract, and maintains a payout ledger of partner invoices showing how much has been earned and how much has actually been paid out.

## Target user

- **Partners (referrers)** — existing clients of the agency who refer new business and want visibility into their referrals, conversions, and earnings.
- **Internal admins / finance** — staff who manage partner rates, confirm conversions, track contract payments, and process partner payouts.

## Problem it solves

Tracking who referred whom, whether a referral became a paying contract, and calculating the correct commission per payment is manual, error-prone, and opaque. Clara Central centralizes referral attribution, commission calculation, and payout accounting so both the agency and its partners trust the numbers.

## MVP scope

1. **Invitation links** — unique per-partner referral links that attribute new prospects to the referrer.
2. **Referral tracking** — pipeline from referred lead → signed contract, with conversion status.
3. **Commission rates** — per-partner rate driving the percentage earned on a referral's payments.
4. **Payments** — record payments received against a contract; accrue commission per payment.
5. **Partner payout invoices** — ledger of commission owed vs. paid per partner.

## Glossary

| Term | Meaning |
|------|---------|
| Partner / Referrer | A past client who refers new business through an invitation link. |
| Referral | An introduced prospect attributed to a partner. |
| Conversion | A referral that becomes a signed contract. |
| Rate | The commission percentage a partner earns on their referrals' payments. |
| Payout / Partner invoice | Record of commission owed to, and paid to, a partner. |

---

**Keep this file lean.** Roadmap, ticket lists, and detailed feature specs belong in your issue tracker (Linear, GitHub Issues, Zoho, etc.) — not here. This file captures the *stable shape* of the product (what + who + why), not the in-flight work.
