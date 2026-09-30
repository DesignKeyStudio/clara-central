import Link from "next/link";
import type { ElementType } from "react";
import { ArrowRight, Briefcase } from "lucide-react";
import { AuthSplitShell } from "@/components/layout/auth-split-shell";
import { Button } from "@/components/ui/button";

/**
 * Public landing — partner-first home. Returning partners sign in; new prospects
 * apply. Staff/admin sign-in is intentionally demoted to a small footer link
 * (not a co-equal CTA) so partners are guided straight to their portal — admin
 * auth & middleware are unchanged, this is prominence only. Authenticated users
 * never see this: middleware bounces them to their portal home.
 */
export default function LandingPage() {
  return (
    <AuthSplitShell>
      <div className="w-full max-w-lg space-y-8">
        <div className="space-y-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary/70">
            Partner portal
          </p>
          <h1 className="font-display text-4xl font-bold text-[#00342E]">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Track the referrals you send our way and the commission they earn.
          </p>
        </div>

        <div className="grid gap-3">
          <PortalCard
            href="/partner/login"
            icon={Briefcase}
            title="Sign in to your portal"
            description="Log referrals, track your commission, and grab marketing materials."
          />
          <Button asChild variant="ghost" className="h-12 rounded-xl text-base font-medium hover:bg-transparent dark:hover:bg-transparent hover:text-primary">
            <Link href="/apply">New here? Apply to join the program</Link>
          </Button>
        </div>

        <div className="space-y-2 text-center">
          <p className="text-sm text-muted-foreground">
            Partners sign in with a one-time code sent to their email.
          </p>
          <p className="text-sm text-muted-foreground">
            Staff member?{" "}
            <Link
              href="/admin/login"
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              Admin login
            </Link>
          </p>
        </div>
      </div>
    </AuthSplitShell>
  );
}

function PortalCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: ElementType;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl bg-card p-4 text-left shadow-[0_4px_24px_-6px_rgba(168,163,148,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-8px_rgba(168,163,148,0.5)]"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#ECF4EC] text-primary ring-1 ring-primary/10">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold tracking-tight text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button asChild size="icon" className="shrink-0">
        <span aria-hidden>
          <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </Button>
    </Link>
  );
}
