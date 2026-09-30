# Security Policy

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report vulnerabilities privately through
[GitHub's private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
on this repository (Security → Report a vulnerability), or by email to
[dev2@designkey.us](mailto:dev2@designkey.us).

Please include:

- What the issue is and where in the code it lives
- Steps to reproduce, or a proof of concept
- The impact you believe it has

We aim to acknowledge reports within 3 business days. Please give us a reasonable
window to ship a fix before disclosing publicly.

## Supported versions

This project has not yet cut a stable release. Security fixes land on the default
branch only.

---

## Before you deploy this to production

This is application source, not a hardened turnkey product. The following are
**your** responsibility as the operator, and at least the first is easy to get
wrong because the insecure setting is the default.

### 1. Partner one-time-code login (`NEXT_PUBLIC_PARTNER_OTP_EMAIL`)

Set `NEXT_PUBLIC_PARTNER_OTP_EMAIL="true"` in any environment reachable by real users.

When this variable is unset or `false`, partner login **accepts any 6-digit code**
and mints a session server-side for the matching approved partner without sending
or verifying an email. This exists so the app is usable before a sending domain is
configured, and it means an attacker who knows an approved partner's email address
can sign in as them.

Enabling real delivery also requires Supabase dashboard configuration — see the
notes on `NEXT_PUBLIC_PARTNER_OTP_EMAIL` in [`.env.example`](./.env.example).

### 2. Rotate every default credential

`prisma/db seed` creates an admin using a password published in this repository's
README. Override `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, or change the password
immediately after seeding. Never seed a shared database with the defaults.

### 3. Review Row Level Security

The schema ships RLS policies, but this application performs most access control in
the service layer using a service-role connection, which **bypasses RLS**. Audit the
policies against your own threat model before trusting them as a second line of
defence, and run Supabase's advisors (`get_advisors`) on your project.

### 4. Keep secrets out of the repository

`SUPABASE_SERVICE_ROLE_KEY` grants full database access and bypasses RLS. It must
never reach the browser or a commit. Ignored env paths are listed in
[`.gitignore`](./.gitignore); enable
[GitHub secret scanning and push protection](https://docs.github.com/en/code-security/secret-scanning/enabling-secret-scanning-features/enabling-push-protection-for-your-repository)
on your fork.

### 5. Replace the placeholder legal terms

[`src/app/terms/page.tsx`](./src/app/terms/page.tsx) ships as a template skeleton, not
an enforceable agreement. Have counsel draft the real thing before onboarding partners.
