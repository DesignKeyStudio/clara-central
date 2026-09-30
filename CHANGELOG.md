# Changelog

All notable, user-facing changes to Clara Central are recorded here. The format is
based on [Keep a Changelog](https://keepachangelog.com). Engineering references are
kept in HTML comments so they stay available without cluttering the public notes.

## [Unreleased] — 2026-07-01

A big wave of partner-facing features and hardening: partners get a personal, auto-attributing referral link, richer email notifications, and self-service account profiles; admins get an analytics dashboard, the ability to remove partners and referrals, and a redesigned marketing library with cover images; commission rates are now locked in per referral so past earnings never shift; and sign-in plus the database are hardened.

### Added
- **Personal referral links.** Every partner now has a unique, shareable link they can copy from their dashboard ("Your referral link"). Anyone who submits their details through it lands on a branded, no-login page and is automatically attributed to that partner — and the partner is emailed when their link brings in a lead. <!-- ref: TKT-002 -->
- **Account profiles.** Admins and partners can now manage their own profile from the account menu — name and phone (and, for partners, company, role, location, website plus email/SMS notification preferences). Your sign-in email stays fixed. <!-- ref: profiles -->
- **Admin analytics dashboard.** `/admin` is now an at-a-glance overview: commission earned / paid / outstanding, active partners, referral volume and conversion rate, a commission-over-time chart, and a referral-pipeline funnel. <!-- ref: TKT-004 -->
- **More email notifications.** Partners are now emailed when a payout is recorded, when one of their referrals reaches a notable stage (closed / lost / not qualified), and when a new invoice is raised on their referral; applicants receive a courteous notice if their application is declined. <!-- ref: TKT-003 -->
- **Marketing cover images.** Marketing items can now carry a cover image (upload, replace, or remove); non-image files and links show a clear file-type placeholder instead. <!-- ref: marketing -->
- **Remove partners and referrals.** Admins can delete a partner (removing their referrals, invoices, and payouts) or an individual referral, with a clear confirmation of what will be removed and a full audit-log record. <!-- ref: TKT-008 -->

### Changed
- **Partner-first landing page.** The home page now leads with partner sign-in and an "apply to join" path; admin sign-in moved to a small footer link. <!-- ref: TKT-007 -->
- **Redesigned marketing library.** The admin marketing library now matches the partner grid — vertical cards with a large thumbnail and type chip — and warns you before discarding unsaved edits when you close an item dialog. <!-- ref: marketing -->
- **Real partner sign-in codes.** Partners now sign in with a genuine one-time code emailed to them, replacing the development placeholder. <!-- ref: TKT-001 -->
- **Commission rates are fixed per referral.** Each referral captures the partner's rate when it's created; changing a partner's rate afterward applies only to new referrals and never re-prices past ones or shifts already-earned commission. The edit-partner screen states this explicitly. <!-- ref: TKT-005 -->

### Fixed
- **Onboarding is no longer blocked by a leftover account.** If a partner's login was left orphaned (e.g. after a data reset), inviting or approving them now reclaims it instead of failing. <!-- ref: onboarding -->

### Security
- **Row-level security on every table.** The database now enforces access at the row level — a partner can only ever read their own referrals, invoices, and payouts, while admins read across the platform — as defense-in-depth beneath the existing application checks. <!-- ref: TKT-006 -->
- **Sign-in rate limiting.** Partner one-time-code requests are now rate-limited per email and IP to deter abuse. <!-- ref: TKT-001 -->
