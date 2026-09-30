"use client";

import type { Column } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  children: React.ReactNode;
  /** Right-align for money columns, center for integer counts (else left). */
  align?: "left" | "center" | "right";
  className?: string;
}

/**
 * Clickable column header that toggles sorting. Renders the label in the app's
 * uppercase-muted header style so sortable and static headers look identical;
 * falls back to a plain label when the column isn't sortable.
 */
export function SortableHeader<TData, TValue>({
  column,
  children,
  align = "left",
  className,
}: SortableHeaderProps<TData, TValue>) {
  const label = (
    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  );

  if (!column.getCanSort()) {
    return (
      <div
        className={cn(
          align === "right" && "w-full text-right",
          align === "center" && "w-full text-center",
          className,
        )}
      >
        {label}
      </div>
    );
  }

  return (
    <div
      className={cn(
        align === "right" && "flex justify-end",
        align === "center" && "flex justify-center",
      )}
    >
      <Button
        variant="ghost"
        size="sm"
        className={cn("group -mx-2 h-8 px-2 hover:bg-transparent", className)}
        // Three-state cycle incl. removal: unsorted → asc → desc → unsorted (a 3rd click clears the sort).
        onClick={column.getToggleSortingHandler()}
      >
        {label}
        {/* Affordance shows only on hover or on the active sort column; active arrow is accent green. */}
        {column.getIsSorted() === "asc" ? (
          <ArrowUp className="ml-2 size-3.5 text-primary" />
        ) : column.getIsSorted() === "desc" ? (
          <ArrowDown className="ml-2 size-3.5 text-primary" />
        ) : (
          <ArrowUpDown className="ml-2 size-3.5 text-muted-foreground/60 opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </Button>
    </div>
  );
}
