import type { CSSProperties, ReactNode } from "react";
import { BrandMark } from "@/components/layout/brand-mark";
import { cn } from "@/lib/utils";

// Subtle warm dotted grid, faded toward the edges — manila-paper backdrop.
const dotGrid: CSSProperties = {
  backgroundImage: "radial-gradient(rgba(168, 163, 148, 0.22) 1px, transparent 1px)",
  backgroundSize: "22px 22px",
  maskImage: "radial-gradient(ellipse 60% 55% at 50% 38%, #000 25%, transparent 75%)",
  WebkitMaskImage: "radial-gradient(ellipse 60% 55% at 50% 38%, #000 25%, transparent 75%)",
};

/**
 * Centered full-screen frame for auth screens (landing, login, password reset):
 * faint dotted-grid backdrop + the brand mark, then the page's content. Width is
 * controlled by `className` (defaults to a single narrow card column).
 */
export function AuthShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div aria-hidden className="pointer-events-none absolute inset-0" style={dotGrid} />
      <div className={cn("relative z-10 flex w-full max-w-sm flex-col items-center gap-6", className)}>
        <BrandMark href="/" />
        {children}
      </div>
    </div>
  );
}
