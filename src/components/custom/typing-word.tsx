"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Decorative typewriter: types `word` out, holds, erases, and repeats — with a
 * blinking caret. Used in the login decorative panel. The surrounding text stays
 * static; only this word animates.
 */
export function TypingWord({ word, className }: { word: string; className?: string }) {
  const [len, setLen] = useState(0);
  const [phase, setPhase] = useState<"typing" | "holding" | "erasing">("typing");

  // Every transition happens inside the timeout, never synchronously in the effect
  // body — the end-of-word and start-of-word phase flips used to fire on the spot,
  // which cost a cascading render each cycle. Folding them into the tick costs one
  // extra frame-length at each turnaround (~110ms after typing, ~55ms after
  // erasing), imperceptible in a decorative loop.
  useEffect(() => {
    const delay = phase === "holding" ? 1800 : phase === "erasing" ? 55 : 110;
    const t = setTimeout(() => {
      if (phase === "holding") {
        setPhase("erasing");
      } else if (phase === "typing") {
        if (len >= word.length) setPhase("holding");
        else setLen(len + 1);
      } else {
        if (len <= 0) setPhase("typing");
        else setLen(len - 1);
      }
    }, delay);
    return () => clearTimeout(t);
  }, [len, phase, word.length]);

  return (
    <span className={cn("whitespace-nowrap", className)}>
      {word.slice(0, len)}
      <span className="ml-0.5 inline-block animate-[caret-blink_1.1s_step-end_infinite] font-normal text-[#00342E]">
        |
      </span>
    </span>
  );
}
