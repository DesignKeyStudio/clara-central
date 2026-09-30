"use client";

import { BRAND_GRADIENT } from "@/lib/brand";

interface GradientProgressBarProps {
  value: number;
  label: string;
  formattedValue: string;
}

export function GradientProgressBar({ value, label, formattedValue }: GradientProgressBarProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-lg font-semibold tabular-nums tracking-tight">{formattedValue}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, background: BRAND_GRADIENT }}
        />
      </div>
    </div>
  );
}
