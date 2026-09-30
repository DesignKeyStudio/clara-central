import { BadgeCheck, Banknote, TrendingUp } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { BrandMark } from "@/components/layout/brand-mark";
import { TypingWord } from "@/components/custom/typing-word";

// Warm manila dotted-paper texture for the form column.
const dotGrid: CSSProperties = {
  backgroundImage: "radial-gradient(rgba(168, 163, 148, 0.22) 1px, transparent 1px)",
  backgroundSize: "22px 22px",
};

/**
 * Two-column auth frame for the login screens. Left: the brand mark, an optional
 * top-right slot (cross-portal link), and the page's form (`children`). Right
 * (≥lg only): a decorative panel with a slowly drifting "aurora" gradient and a
 * faux prompt pill with a blinking caret. Used by admin + partner login.
 */
export function AuthSplitShell({
  topRight,
  children,
}: {
  topRight?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      {/* Left — form column */}
      <div className="relative flex flex-col px-6 py-6 sm:px-10">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={dotGrid} />
        <header className="relative z-10 flex items-center justify-between gap-4">
          <BrandMark href="/" />
          {topRight}
        </header>
        <main className="relative z-10 flex flex-1 items-center justify-center py-10">{children}</main>
      </div>

      {/* Right — animated decorative panel (desktop only) */}
      <div className="hidden p-3 lg:block">
        <div className="relative h-full overflow-hidden rounded-3xl bg-[#ECF4EC]">
          {/* Soft brand-teal blobs on white — heavily blurred & bleeding past the
              clip so no edge can ever show */}
          <div aria-hidden className="pointer-events-none absolute -inset-1/4 overflow-hidden">
            <div className="absolute top-[28%] left-[28%] size-[52%] animate-[drift_14s_ease-in-out_infinite] rounded-full bg-[radial-gradient(circle,#34D8B8_0%,#3FC9AE_45%,transparent_72%)] blur-3xl" />
            <div className="absolute top-[34%] left-[40%] size-[42%] animate-[drift_19s_ease-in-out_infinite] rounded-full bg-[radial-gradient(circle,rgba(0,104,91,0.28)_0%,transparent_70%)] blur-3xl [animation-delay:-7s]" />
          </div>

          {/* Product visual: a referral → commission → payout scene */}
          <div className="relative flex h-full flex-col items-center justify-center gap-6 p-12">
            <div className="flex flex-col items-center gap-2">
              <p className="max-w-sm text-center text-xl font-medium text-[#00342E]/70">
                Turn referrals into{" "}
                <TypingWord word="revenue" className="font-semibold text-[#00342E]" />
              </p>
              <p className="max-w-xs text-center text-sm text-[#00342E]/55">
                Every closed deal you send our way earns you a share of the invoices it generates.
              </p>
            </div>

            <div className="relative w-full max-w-sm">
              {/* Commission earned */}
              <div className="animate-[float_7s_ease-in-out_infinite] rounded-2xl border border-white/50 bg-white/40 p-5 shadow-lg backdrop-blur-md">
                <p className="text-xs font-medium text-[#00342E]/60">Commission earned</p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-[#00342E]">$1,800.00</p>
                <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[#00685B]">
                  <TrendingUp className="size-3.5" />
                  12% of $15,000 in referred invoices
                </p>
              </div>

              {/* Referral row */}
              <div className="mt-4 flex animate-[float_8s_ease-in-out_infinite] items-center gap-3 rounded-2xl border border-white/50 bg-white/40 p-4 shadow-lg backdrop-blur-md [animation-delay:-2s]">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#ECF4EC] text-sm font-semibold text-[#00685B]">
                  CP
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#00342E]">Cedar &amp; Pine Cafe</p>
                  <p className="truncate text-xs text-[#00342E]/60">Referred by Jordan Diaz</p>
                </div>
                <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-[#ECF4EC] px-2 py-0.5 text-xs font-medium text-success">
                  <BadgeCheck className="size-3.5" />
                  Deal Closed
                </span>
              </div>

              {/* Payout chip */}
              <div className="mx-auto mt-4 flex w-fit animate-[float_6500ms_ease-in-out_infinite] items-center gap-2 rounded-full border border-white/50 bg-white/40 py-2 pr-4 pl-2 shadow-lg backdrop-blur-md [animation-delay:-1s]">
                <span className="flex size-6 items-center justify-center rounded-full bg-[#00685B] text-white">
                  <Banknote className="size-3.5" />
                </span>
                <span className="text-sm font-medium text-[#00342E]">Payout sent · $1,800</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
