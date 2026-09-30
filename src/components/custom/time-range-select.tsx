"use client";

import { cn, type TimeRange } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** The one canonical option set — every list toolbar offers the same four ranges. */
const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "any", label: "Any time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

export interface TimeRangeSelectProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
  /** Accessible name for the trigger — say which dates it narrows. */
  ariaLabel?: string;
  className?: string;
}

/**
 * Controlled "Any time / Last N days" filter for list toolbars. Pair it with
 * {@link withinTimeRange} in the page's filter memo — the two were split out
 * because six toolbars previously each rendered an uncontrolled `Select` that
 * looked live but filtered nothing.
 */
export function TimeRangeSelect({
  value,
  onChange,
  ariaLabel = "Filter by time",
  className,
}: TimeRangeSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as TimeRange)}>
      <SelectTrigger className={cn("w-[150px]", className)} aria-label={ariaLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TIME_RANGE_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
