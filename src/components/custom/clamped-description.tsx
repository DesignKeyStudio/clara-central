"use client";

import { useEffect, useRef, useState } from "react";
import { RichTextDisplay } from "@/components/custom/rich-text-editor";
import { cn } from "@/lib/utils";

/**
 * Rich-text description shown collapsed to its first row (first wrapped line for
 * text, first item for a list) with a bold green "…" that expands the full
 * content in place; an expanded view offers "Show less". The "…" only appears
 * when the content actually overflows one line. Shared by the partner marketing
 * cards and the admin marketing rows so both clamp identically.
 */
export function ClampedDescription({ html, className }: { html: string; className?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Clip to one line-height → measure vertical overflow of the clipped box.
    const el = ref.current?.firstElementChild as HTMLElement | null;
    if (!el) return;
    // Measured from a ResizeObserver rather than synchronously in this effect.
    // The callback fires once on observe(), so the mount/`html`-change measurement
    // still happens, and it fires again whenever the clipped box is re-laid out —
    // which is what keeps the "Show More" affordance honest after a viewport
    // resize, where the old code left it stale. (Setting state straight from an
    // effect body also costs an extra render pass on every mount.)
    const observer = new ResizeObserver(() => {
      setOverflowing(el.scrollHeight > el.clientHeight + 1);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [html]);

  if (expanded) {
    return (
      <div className={cn("mt-1", className)}>
        <RichTextDisplay html={html} className="text-sm text-muted-foreground" />
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-0.5 text-xs font-semibold text-primary hover:underline"
        >
          Show Less
        </button>
      </div>
    );
  }

  return (
    <div className={cn("mt-1", className)}>
      <div ref={ref}>
        <RichTextDisplay
          html={html}
          className="max-h-5 overflow-hidden text-sm leading-5 text-muted-foreground [&_li]:!my-0 [&_ol]:!my-0 [&_p]:!my-0 [&_ul]:!my-0 [&_ul]:!pl-4 [&_ol]:!pl-4"
        />
      </div>
      {overflowing ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-0.5 block text-xs font-semibold text-primary hover:underline"
          aria-label="Show full description"
        >
          Show More
        </button>
      ) : null}
    </div>
  );
}
