"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface KpiCardProps {
  label: string;
  value: string;
  subtitle?: string;
  href?: string;
  trend?: number;
  linkLabel?: string;
  linkHref?: string;
  valueClassName?: string;
  /** @deprecated stat cards no longer render an icon — the figure is the content (DESIGN stat-card). */
  icon?: React.ElementType;
  /** @deprecated see `icon`. */
  iconClassName?: string;
}

export function KpiCard({ label, value, subtitle, href, trend, linkLabel, linkHref, valueClassName }: KpiCardProps) {
  const content = (
    <Card
      className={`gap-0 rounded-xl py-0 shadow-[0_4px_24px_-6px_rgba(168,163,148,0.35)] ${href ? "transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-8px_rgba(168,163,148,0.5)] cursor-pointer" : ""}`}
    >
      <CardContent className="p-[18px]">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-muted-foreground leading-[16px]">{label}</p>
            {linkLabel && linkHref && (
              <Link
                href={linkHref}
                className="flex items-center gap-0.5 text-xs font-semibold text-primary hover:text-primary/80"
                onClick={(e) => e.stopPropagation()}
              >
                {linkLabel} <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            )}
          </div>
          <div className="flex items-baseline gap-1">
            <p className={`text-[32px] font-semibold tabular-nums leading-8 tracking-[-0.6px] text-foreground ${valueClassName || ""}`}>{value}</p>
            {trend !== undefined && (
              <span className={`text-xs font-semibold ${trend > 0 ? "text-success" : trend < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                ~&gt; {trend > 0 ? "+" : ""}{trend.toFixed(1)}%
              </span>
            )}
          </div>
          {subtitle && <p className="text-[11px] text-muted-foreground leading-none">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
