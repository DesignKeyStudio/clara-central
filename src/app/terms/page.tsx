import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/layout/brand-mark";

export const metadata: Metadata = {
  title: "Referral Partner Terms & Conditions",
  description: "The terms governing participation in the referral partner program.",
};

// Bump this whenever the substance of the agreement changes.
const LAST_UPDATED = "Not yet published";

// Reading-column width (~720px document). Set via inline style rather than a
// Tailwind `max-w-*` utility because arbitrary/less-common max-width classes
// don't reliably get generated in this project's build.
const COLUMN_WIDTH = "47rem";

// Warm dotted-grid header wash (matches the auth screens), faded toward the fold.
const dotGrid: CSSProperties = {
  backgroundImage: "radial-gradient(rgba(168, 163, 148, 0.22) 1px, transparent 1px)",
  backgroundSize: "22px 22px",
  maskImage: "linear-gradient(to bottom, #000, transparent)",
  WebkitMaskImage: "linear-gradient(to bottom, #000, transparent)",
};

/**
 * Public referral-partner Terms & Conditions — TEMPLATE.
 *
 * Linked from the onboarding form (invite + apply) and reachable without a
 * session (see middleware PUBLIC_ROUTES). Static legal prose is authored as
 * semantic JSX rather than rendered markdown so styling stays in lockstep with
 * the brand tokens.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS FILE SHIPS AS A SKELETON ON PURPOSE.
 *
 * A referral agreement is a binding contract whose enforceability depends on
 * your entity, your jurisdiction, and your commission model. Do not deploy this
 * page as-is. Replace every section below with terms drafted or reviewed by your
 * own counsel, then set LAST_UPDATED.
 *
 * The section skeleton reflects what this app's data model actually implements
 * (commission rate per partner, a commission window, paid-invoice-triggered
 * accrual, payout records), so it is a reasonable outline to hand to a lawyer.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function TermsPage() {
  return (
    <div className="relative min-h-screen bg-background">
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 h-80" style={dotGrid} />

      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-sm">
        <div
          style={{ maxWidth: COLUMN_WIDTH }}
          className="mx-auto flex items-center justify-between gap-4 px-5 py-3 sm:px-6"
        >
          <BrandMark href="/" className="h-8 w-auto" />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to home
          </Link>
        </div>
      </header>

      <main
        style={{ maxWidth: COLUMN_WIDTH }}
        className="relative z-10 mx-auto px-4 pb-20 pt-12 sm:px-6 md:pt-16"
      >
        {/* Centered title block, above the document card */}
        <div className="mb-8 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/70">
            Referral Partner Program
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold text-[#00342E] sm:text-4xl">
            Terms &amp; Conditions
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">Last updated {LAST_UPDATED}</p>
        </div>

        <div
          role="note"
          className="mb-8 rounded-xl border border-amber-300/70 bg-amber-50 px-5 py-4 text-[15px] leading-7 text-amber-900"
        >
          <p className="font-semibold">Template — not a legal agreement.</p>
          <p className="mt-1">
            This page is a placeholder shipped with the Clara Central source. Replace it with terms
            drafted or reviewed by your own counsel before inviting real partners. See the comments
            in <code className="font-mono text-[13px]">src/app/terms/page.tsx</code>.
          </p>
        </div>

        <article className="rounded-2xl border border-border bg-card px-6 py-8 shadow-[0_4px_24px_-6px_rgba(168,163,148,0.35)] sm:px-10 sm:py-12">
          <div className="space-y-4">
            <P>
              These Referral Partner Terms &amp; Conditions (the &ldquo;Agreement&rdquo;) are issued
              by <Strong>[Your Legal Entity]</Strong>, [entity type] organised under the laws of
              [jurisdiction], with its principal place of business at [address]
              (&ldquo;Company,&rdquo; &ldquo;we,&rdquo; or &ldquo;us&rdquo;).
            </P>
            <P>
              By completing the partner onboarding process and accessing the Partner Portal, you
              (&ldquo;Partner&rdquo;) confirm that you have read, understood, and agreed to be bound
              by this Agreement. If you do not agree, do not proceed with registration.
            </P>
          </div>

          <Section n="1" title="Purpose">
            <P>
              <Placeholder>
                Describe the referral program: approved partners introduce prospective clients in
                exchange for commission on qualifying contracts.
              </Placeholder>
            </P>
          </Section>

          <Section n="2" title="Definitions">
            <dl className="space-y-4">
              <Def term={<>&ldquo;Referral&rdquo;</>}>
                <Placeholder>
                  A prospective client introduced through the Partner Portal. Define the
                  not-already-in-pipeline carve-out.
                </Placeholder>
              </Def>
              <Def term={<>&ldquo;Qualified Referral&rdquo;</>}>
                <Placeholder>
                  A Referral that results in a signed contract within the Commission Window.
                </Placeholder>
              </Def>
              <Def term={<>&ldquo;Commission Window&rdquo;</>}>
                <Placeholder>
                  The period after submission during which commission can accrue. The app stores this
                  per referral — state the duration you configure.
                </Placeholder>
              </Def>
              <Def term={<>&ldquo;Commission&rdquo;</>}>
                <Placeholder>
                  The fee payable to the Partner, calculated as a percentage of Paid Invoices.
                </Placeholder>
              </Def>
              <Def term={<>&ldquo;Commission Rate&rdquo;</>}>
                <Placeholder>
                  The percentage assigned to the Partner&rsquo;s account and shown in their portal.
                  The app supports rate history — say whether changes apply prospectively.
                </Placeholder>
              </Def>
              <Def term={<>&ldquo;Partner Portal&rdquo;</>}>
                <Placeholder>The platform through which referrals and payouts are tracked.</Placeholder>
              </Def>
              <Def term={<>&ldquo;Paid Invoice&rdquo;</>}>
                <Placeholder>
                  An invoice paid in full whose issue date falls within the Commission Window.
                </Placeholder>
              </Def>
            </dl>
          </Section>

          <Section n="3" title="Onboarding and Portal Access">
            <P>
              <Placeholder>
                How access is granted (invitation or approved self-registration), the Partner&rsquo;s
                responsibility for account security, and the Company&rsquo;s right to suspend access.
              </Placeholder>
            </P>
          </Section>

          <Section n="4" title="Partner Obligations">
            <P>
              <Placeholder>
                Accurate submissions, no misrepresentation, compliance with law, permitted brand
                usage, required disclosure of the referral relationship, and no solicitation of
                existing clients.
              </Placeholder>
            </P>
          </Section>

          <Section n="5" title="Company Obligations">
            <P>
              <Placeholder>
                What the Company commits to: reviewing referrals, maintaining records, and reporting
                commission in the portal.
              </Placeholder>
            </P>
          </Section>

          <Section n="6" title="Commission">
            <P>
              <Placeholder>
                The core commercial terms: when commission is earned, how the rate is set and
                changed, the commission window, exclusions for existing clients, how disputed
                referrals are resolved, and an explicit no-guaranteed-income acknowledgement.
              </Placeholder>
            </P>
          </Section>

          <Section n="7" title="Payment and Payouts">
            <P>
              <Placeholder>
                Payout cadence, minimum thresholds, payment method, currency, and who bears
                transaction fees and taxes.
              </Placeholder>
            </P>
          </Section>

          <Section n="8" title="Confidentiality">
            <P>
              <Placeholder>
                Treatment of client information and pipeline data disclosed through the portal.
              </Placeholder>
            </P>
          </Section>

          <Section n="9" title="Data Protection">
            <P>
              <Placeholder>
                Each party&rsquo;s role regarding personal data of referred prospects, and the legal
                basis for contacting them. Align this with your privacy policy.
              </Placeholder>
            </P>
          </Section>

          <Section n="10" title="Limitation of Liability">
            <P>
              <Placeholder>Liability caps and excluded categories of loss.</Placeholder>
            </P>
          </Section>

          <Section n="11" title="Term and Termination">
            <P>
              <Placeholder>
                Start date, termination for convenience and for cause, the effect of termination on
                accrued but unpaid commission, and which sections survive.
              </Placeholder>
            </P>
          </Section>

          <Section n="12" title="Independent Contractor Status">
            <P>
              <Placeholder>
                No employment, partnership, agency, or joint venture is created.
              </Placeholder>
            </P>
          </Section>

          <Section n="13" title="General">
            <P>
              <Placeholder>
                Entire agreement, amendments, assignment, waiver, severability, governing law and
                venue, dispute resolution, and a notice address.
              </Placeholder>
            </P>
          </Section>

          <Section n={null} title="Acceptance">
            <P>
              By completing the partner onboarding process and accessing the Partner Portal, you
              confirm that you have read, understood, and agreed to be bound by these Terms &amp;
              Conditions.
            </P>
          </Section>
        </article>

        <footer className="mt-10 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to home
          </Link>
        </footer>
      </main>
    </div>
  );
}

/**
 * A numbered top-level section with a display heading. Pass `n={null}` for an
 * unnumbered section. A hairline rule + generous top spacing separates each
 * section so the document reads as structured chapters, not one wall of text.
 */
function Section({ n, title, children }: { n: string | null; title: string; children: ReactNode }) {
  return (
    <section className="mt-8 space-y-4 border-t border-border/70 pt-8">
      <h2 className="font-display text-xl font-semibold text-[#00342E]">
        {n !== null && <span className="text-primary/60">{n}.&nbsp;</span>}
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Body paragraph — the standard legal-prose type treatment. */
function P({ children }: { children: ReactNode }) {
  return <p className="text-[15px] leading-7 text-foreground/80">{children}</p>;
}

/** Bold inline emphasis for defined terms and clause lead-ins. */
function Strong({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-foreground">{children}</strong>;
}

/**
 * Marks drafting guidance that must be replaced with real terms. Rendered in
 * muted italics so an un-customised page is obviously unfinished on sight.
 */
function Placeholder({ children }: { children: ReactNode }) {
  return <span className="italic text-muted-foreground">[Draft: {children}]</span>;
}

/** A single definition entry: bold term + its meaning. */
function Def({ term, children }: { term: ReactNode; children: ReactNode }) {
  return (
    <div className="text-[15px] leading-7 text-foreground/80">
      <dt className="inline font-semibold text-foreground">{term}</dt>{" "}
      <dd className="inline">{children}</dd>
    </div>
  );
}
