import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Clara Central brand lockup — the SVG logo (icon + "ClaraCentral" wordmark).
 * Single source of the brand mark; reused by the auth screens and the admin
 * sidebar. Collapsed rails pass `glyphOnly` for the compact icon-only mark.
 */
export function BrandMark({
  href,
  glyphOnly = false,
  className,
}: {
  href?: string;
  /** Render the compact icon-only mark instead of the full lockup — e.g. a collapsed sidebar rail. */
  glyphOnly?: boolean;
  className?: string;
}) {
  const inner = glyphOnly ? (
    <Image
      src="/clara-central-logo-mini.svg"
      alt="Clara Central"
      width={120}
      height={120}
      priority
      className={cn("h-7 w-7", className)}
    />
  ) : (
    <Image
      src="/clara-central-logo.svg"
      alt="Clara Central"
      width={466}
      height={120}
      priority
      className={cn("h-[50px] w-auto", className)}
    />
  );

  return href ? (
    <Link href={href} className="inline-flex" aria-label="Clara Central — home">
      {inner}
    </Link>
  ) : (
    inner
  );
}
