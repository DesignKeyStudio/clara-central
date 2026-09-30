"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import type { Matcher } from "react-day-picker";

import { cn, formatLocalDate, parseLocalDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface DatePickerProps {
  /** Controlled value as a LOCAL `YYYY-MM-DD` string. Empty/undefined = no selection. */
  value?: string;
  /** Emits a LOCAL `YYYY-MM-DD` string, or "" when cleared. */
  onChange: (value: string) => void;
  /** Earliest selectable day (inclusive), as `YYYY-MM-DD`. */
  min?: string;
  /** Latest selectable day (inclusive), as `YYYY-MM-DD` (e.g. today). */
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Show a "Clear" action in the popover (for optional fields). */
  clearable?: boolean;
  /** Quick month + year dropdowns — handy for back-dated entries. Default true. */
  withDropdownNav?: boolean;
  className?: string;
  /** Forwarded onto the trigger Button (FormControl injects id/aria-* here). */
  id?: string;
  "aria-label"?: string;
}

/**
 * Themed single-date picker: a shadcn `Calendar` in a `Popover` behind a full-width
 * `Button` trigger (clicking anywhere on it opens the calendar). String-in / string-out
 * (`YYYY-MM-DD`), timezone-safe by construction via `parseLocalDate` / `formatLocalDate`
 * — it never touches `toISOString`, so a picked day is stored as that exact calendar day.
 *
 * `forwardRef` + spreading the injected props onto the trigger lets it sit inside a
 * `<FormControl>` (which wires id/aria/ref) — pass `value`/`onChange`, not `{...field}`.
 */
export const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  function DatePicker(
    {
      value,
      onChange,
      min,
      max,
      placeholder = "Pick a date",
      disabled = false,
      clearable = false,
      withDropdownNav = true,
      className,
      ...triggerProps
    },
    ref,
  ) {
    const [open, setOpen] = React.useState(false);

    const selected = parseLocalDate(value);
    const minDate = parseLocalDate(min);
    const maxDate = parseLocalDate(max);

    // DateBefore/DateAfter matchers are EXCLUSIVE, so min/max stay selectable.
    const disabledDays: Matcher[] = [
      ...(minDate ? [{ before: minDate }] : []),
      ...(maxDate ? [{ after: maxDate }] : []),
    ];

    const handleSelect = (date: Date | undefined) => {
      onChange(date ? formatLocalDate(date) : "");
      if (date) setOpen(false);
    };

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            type="button"
            variant="outline"
            disabled={disabled}
            data-empty={!selected}
            className={cn(
              "w-full justify-start bg-white text-left font-normal data-[empty=true]:text-muted-foreground",
              className,
            )}
            {...triggerProps}
          >
            <CalendarIcon className="size-4 opacity-70" />
            {selected ? format(selected, "MMM d, yyyy") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            defaultMonth={selected ?? maxDate ?? new Date()}
            disabled={disabledDays.length ? disabledDays : undefined}
            captionLayout={withDropdownNav ? "dropdown" : "label"}
            startMonth={new Date(2015, 0)}
            endMonth={new Date(new Date().getFullYear() + 1, 11)}
            autoFocus
          />
          {clearable && selected && (
            <div className="border-t p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground"
                onClick={() => handleSelect(undefined)}
              >
                <X className="size-4" /> Clear
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  },
);
