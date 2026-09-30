"use client";

import { useTheme } from "next-themes";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useClientValue } from "@/hooks/use-client-value";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils";
import type { CommissionTrendPoint } from "@/lib/services/dashboard-service";

// Recharts paints fills/strokes as SVG attributes, where CSS `var(--token)` does
// NOT resolve — so we hand the chart concrete hex/rgba per theme instead. Greens
// (earned) and golds (paid) mirror the brand chart palette in globals.css, brightened
// for the dark surface so the two series stay legible.
type Palette = {
  earned: string;
  paid: string;
  funnel: string;
  grid: string;
  axis: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
};

const LIGHT: Palette = {
  earned: "#00685B",
  paid: "#865F11",
  funnel: "#00685B",
  grid: "#EFEDE9",
  axis: "#737373",
  tooltipBg: "#FFFFFF",
  tooltipBorder: "#EFEDE9",
  tooltipText: "#0A0A0A",
};

const DARK: Palette = {
  earned: "#2BB39A",
  paid: "#C79A3E",
  funnel: "#2BB39A",
  grid: "rgba(255,255,255,0.10)",
  axis: "#A3A3A3",
  tooltipBg: "#262626",
  tooltipBorder: "rgba(255,255,255,0.12)",
  tooltipText: "#FAFAFA",
};

/**
 * Resolve the active palette plus a `mounted` flag. Recharts measures its parent
 * with a ResizeObserver, so it can't render server-side (zero size) — gate the
 * chart on `mounted` to skip the SSR pass and avoid a theme-color flash.
 */
function useChart(): { mounted: boolean; palette: Palette } {
  const mounted = useClientValue(() => true, false);
  const { resolvedTheme } = useTheme();
  return { mounted, palette: resolvedTheme === "dark" ? DARK : LIGHT };
}

function tooltipStyles(p: Palette) {
  return {
    contentStyle: {
      background: p.tooltipBg,
      border: `1px solid ${p.tooltipBorder}`,
      borderRadius: 8,
      color: p.tooltipText,
      fontSize: 12,
    },
    labelStyle: { color: p.tooltipText, fontWeight: 600 },
    itemStyle: { color: p.tooltipText },
  };
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="size-2.5 rounded-full" style={{ background: color }} aria-hidden />
      {label}
    </span>
  );
}

/** Earned vs. paid commission over the trailing months (area chart). */
export function CommissionTrendChart({ data }: { data: CommissionTrendPoint[] }) {
  const { mounted, palette: p } = useChart();
  const t = tooltipStyles(p);

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
        <LegendDot color={p.earned} label="Earned" />
        <LegendDot color={p.paid} label="Paid" />
      </div>
      {mounted ? (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -4 }}>
            <defs>
              <linearGradient id="cb-earned-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={p.earned} stopOpacity={0.25} />
                <stop offset="100%" stopColor={p.earned} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="cb-paid-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={p.paid} stopOpacity={0.25} />
                <stop offset="100%" stopColor={p.paid} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={p.grid} />
            <XAxis
              dataKey="label"
              height={20}
              tickMargin={4}
              tickLine={false}
              axisLine={false}
              tick={{ fill: p.axis, fontSize: 12 }}
            />
            <YAxis
              width={64}
              tickLine={false}
              axisLine={false}
              tick={{ fill: p.axis, fontSize: 12 }}
              tickFormatter={(v) => formatCurrencyCompact(Number(v))}
            />
            <Tooltip
              cursor={{ stroke: p.grid }}
              {...t}
              formatter={(value, name) => [
                formatCurrency(Number(value)),
                name === "earned" ? "Earned" : "Paid",
              ]}
            />
            <Area
              type="monotone"
              dataKey="earned"
              name="earned"
              stroke={p.earned}
              strokeWidth={2}
              fill="url(#cb-earned-fill)"
            />
            <Area
              type="monotone"
              dataKey="paid"
              name="paid"
              stroke={p.paid}
              strokeWidth={2}
              fill="url(#cb-paid-fill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[260px]" aria-hidden />
      )}
    </div>
  );
}

/** Referral counts per pipeline status (horizontal bar chart). */
export function ReferralFunnelChart({ data }: { data: { label: string; count: number }[] }) {
  const { mounted, palette: p } = useChart();
  const t = tooltipStyles(p);

  if (!mounted) return <div className="h-[300px]" aria-hidden />;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
        <CartesianGrid horizontal={false} stroke={p.grid} />
        <XAxis
          type="number"
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tick={{ fill: p.axis, fontSize: 12 }}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={140}
          tickLine={false}
          axisLine={false}
          tick={{ fill: p.axis, fontSize: 11 }}
        />
        <Tooltip
          cursor={{ fill: p.grid, opacity: 0.4 }}
          {...t}
          formatter={(value) => [Number(value), "Referrals"]}
        />
        <Bar dataKey="count" fill={p.funnel} radius={[0, 4, 4, 0]} maxBarSize={22}>
          <LabelList dataKey="count" position="right" fill={p.axis} fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
