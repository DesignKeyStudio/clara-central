"use client";

import {
  Ban,
  CalendarCheck,
  Check,
  Clock,
  Handshake,
  Inbox,
  Info,
  Minus,
  Phone,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusTone =
  | "success"
  | "warning"
  | "info"
  | "destructive"
  | "neutral"
  | "slate"
  | "teal"
  | "violet"
  | "terracotta"
  | "mauve";

// Tinted pill: a soft semantic fill with the matching color carrying label + icon.
// The extra hues (slate/teal/violet/terracotta/mauve) give the referral pipeline
// distinct, muted per-stage colors.
const TONE: Record<StatusTone, string> = {
  success: "bg-[#ECF4EC] text-success",          // won / approved — green
  warning: "bg-[#F5EAD2] text-warning",          // pending / proposal sent — amber
  info: "bg-[#ECF4EC] text-info",                // info — green
  destructive: "bg-[#F3E1DC] text-destructive",  // rejected / lost — brick
  neutral: "bg-[#F7F5F3] text-muted-foreground", // inactive — warm gray
  slate: "bg-[#EEF1F5] text-[#51607A]",          // submitted
  teal: "bg-[#E2F0F2] text-[#0E7490]",           // contacted
  violet: "bg-[#EEEAF7] text-[#6B4FA6]",         // meeting scheduled
  terracotta: "bg-[#F6E7DC] text-[#B4521E]",     // negotiating
  mauve: "bg-[#F4ECEE] text-[#9A6B73]",          // not qualified
};

// Icon per tone (inherits the tone's text color via currentColor).
const ICON: Record<StatusTone, LucideIcon> = {
  success: Check,
  warning: Clock,
  info: Info,
  destructive: X,
  neutral: Minus,
  slate: Inbox,
  teal: Phone,
  violet: CalendarCheck,
  terracotta: Handshake,
  mauve: Ban,
};

/**
 * Status pill. A soft semantic background tint with the status color carrying
 * the label + a matching icon. Map a domain status to `{ label, tone }` via
 * `src/lib/status-meta.ts`.
 */
export function StatusBadge({
  label,
  tone = "neutral",
  className,
  onRemove,
  removeLabel,
}: {
  label: string;
  tone?: StatusTone;
  className?: string;
  /** When provided, renders a trailing remove (×) button tinted to the tone. */
  onRemove?: () => void;
  /** Accessible label for the remove button. Defaults to `Remove {label}`. */
  removeLabel?: string;
}) {
  const Icon = ICON[tone];
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full py-0.5 pr-2 pl-2 text-sm font-medium whitespace-nowrap",
        onRemove && "pr-1",
        TONE[tone],
        className,
      )}
    >
      {/* text-current keeps the icon on the tone color even inside a dropdown item,
          whose `[&_svg:not([class*='text-'])]` rule would otherwise force it gray. */}
      <Icon className="size-3.5 shrink-0 text-current" aria-hidden="true" />
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel ?? `Remove ${label}`}
          className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-current/70 transition-colors hover:bg-current/20 hover:text-current focus:outline-none focus-visible:ring-2 focus-visible:ring-current/50"
        >
          <X className="size-3" aria-hidden="true" />
        </button>
      )}
    </span>
  );
}
