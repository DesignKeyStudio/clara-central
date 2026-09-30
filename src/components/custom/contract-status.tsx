import { cn } from "@/lib/utils";
import type { StatusTone } from "@/components/custom/status-badge";

// Dot color keyed to the tone. Contract Status only uses success/warning/neutral,
// but the map stays exhaustive over StatusTone.
const DOT: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-info",
  destructive: "bg-destructive",
  neutral: "bg-muted-foreground",
  slate: "bg-[#51607A]",
  teal: "bg-[#0E7490]",
  violet: "bg-[#6B4FA6]",
  terracotta: "bg-[#B4521E]",
  mauve: "bg-[#9A6B73]",
};

/**
 * Quiet, secondary status. A thin border (no fill) wraps only the status name
 * (colored dot + muted label); the optional detail (e.g. a date) sits OUTSIDE
 * the pill, muted. Used for the commission-window / Contract Status,
 * intentionally lighter than the main filled-pill Referral Status.
 */
export function ContractStatus({
  label,
  tone,
  detail,
  className,
}: {
  label: string;
  tone: StatusTone;
  detail?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-sm whitespace-nowrap text-muted-foreground",
        className,
      )}
    >
      {/* Border wraps only the status name (dot + label); detail sits outside. */}
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5">
        <span className={cn("size-1.5 shrink-0 rounded-full", DOT[tone])} aria-hidden="true" />
        {label}
      </span>
      {detail ? <span className="text-muted-foreground/80">{detail}</span> : null}
    </span>
  );
}
