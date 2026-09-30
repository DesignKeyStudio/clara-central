"use client";

import { Avatar as AvatarPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  initials: string;
  size?: "sm" | "md" | "lg";
  /** Monogram tint. In tables this ALTERNATES per row — gold then teal (DESIGN avatar). */
  tint?: "gold" | "teal";
  /** Optional profile picture. Falls back to the initials monogram if absent or it fails to load. */
  imageUrl?: string | null;
}

// sm = 28px with 12px/16px initials — the DESIGN gold-avatar spec.
const sizeClasses = {
  sm: "size-7 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
};

const tintClasses = {
  gold: "bg-brand-bg text-brand",      // #F6F2EA / #865F11
  teal: "bg-accent-bg text-primary",   // #ECF4EC / #00685B
};

export function UserAvatar({ initials, size = "md", tint = "gold", imageUrl }: UserAvatarProps) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium leading-4 select-none",
        sizeClasses[size],
      )}
    >
      {imageUrl ? (
        <AvatarPrimitive.Image src={imageUrl} alt="" className="aspect-square size-full object-cover" />
      ) : null}
      <AvatarPrimitive.Fallback
        className={cn("flex size-full items-center justify-center rounded-full", tintClasses[tint])}
      >
        {initials}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
