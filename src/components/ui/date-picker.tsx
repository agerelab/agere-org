"use client";

import * as React from "react";
import { format as formatDate, type Locale } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange, Matcher } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

/**
 * DatePicker / DateRangePicker — the shadcn date-picker pattern as ready components:
 * outline trigger (36px, same as Input) → Popover → Calendar. Focus moves into the grid on open and
 * returns to the trigger on close; the trigger's accessible name always includes the current value.
 */
interface BaseProps {
  placeholder?: string;
  /** date-fns format string. Default "PPP" (e.g. "September 25th, 2026"; locale-aware). */
  formatStr?: string;
  locale?: Locale;
  disabled?: boolean;
  /** Days that can't be picked (react-day-picker Matcher). */
  disabledDays?: Matcher | Matcher[];
  className?: string;
  id?: string;
  "aria-invalid"?: boolean | "true" | "false";
  "aria-describedby"?: string;
  /** Visible label text, used in the trigger's accessible name when no <label> points at it. */
  label?: string;
  captionLayout?: "label" | "dropdown" | "dropdown-months" | "dropdown-years";
  startMonth?: Date;
  endMonth?: Date;
}

function Trigger({ text, empty, className, ...props }: React.ComponentProps<typeof Button> & { text: string; empty: boolean }) {
  return (
    <Button variant="outline" data-empty={empty || undefined} className={cn("w-full justify-start gap-2 px-3 text-left font-normal data-[empty]:text-muted-foreground has-[>[data-slot=leading-icon]]:pl-3", className)} leadingIcon={<CalendarIcon />} {...props}>
      <span className="truncate">{text}</span>
    </Button>
  );
}

export interface DatePickerProps extends BaseProps {
  value?: Date;
  defaultValue?: Date;
  onValueChange?: (date: Date | undefined) => void;
}

export function DatePicker({
  value: valueProp, defaultValue, onValueChange, placeholder = "Pick a date", formatStr = "PPP", locale, disabled, disabledDays, className, label,
  captionLayout = "label", startMonth, endMonth, ...aria
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [inner, setInner] = React.useState<Date | undefined>(defaultValue);
  const value = valueProp ?? inner;
  const text = value ? formatDate(value, formatStr, { locale }) : placeholder;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Trigger text={text} empty={!value} disabled={disabled} className={className} aria-label={label ? `${label}: ${value ? text : "not set"}` : undefined} {...aria} />
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start" data-slot="popover-content">
        <Calendar
          mode="single"
          selected={value}
          defaultMonth={value}
          locale={locale}
          disabled={disabledDays}
          captionLayout={captionLayout}
          startMonth={startMonth}
          endMonth={endMonth}
          autoFocus
          onSelect={(d) => { setInner(d); onValueChange?.(d); setOpen(false); }}
        />
      </PopoverContent>
    </Popover>
  );
}

export interface DateRangePickerProps extends BaseProps {
  value?: DateRange;
  defaultValue?: DateRange;
  onValueChange?: (range: DateRange | undefined) => void;
  /** Months shown side by side (desktop). Default 2. */
  numberOfMonths?: number;
}

export function DateRangePicker({
  value: valueProp, defaultValue, onValueChange, placeholder = "Pick a date range", formatStr = "LLL d, y", locale, disabled, disabledDays, className, label,
  numberOfMonths = 2, captionLayout = "label", startMonth, endMonth, ...aria
}: DateRangePickerProps) {
  const [inner, setInner] = React.useState<DateRange | undefined>(defaultValue);
  const value = valueProp ?? inner;
  const f = (d: Date) => formatDate(d, formatStr, { locale });
  const text = value?.from ? (value.to ? `${f(value.from)} – ${f(value.to)}` : f(value.from)) : placeholder;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Trigger text={text} empty={!value?.from} disabled={disabled} className={className} aria-label={label ? `${label}: ${value?.from ? text : "not set"}` : undefined} {...aria} />
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start" data-slot="popover-content">
        <Calendar
          mode="range"
          selected={value}
          defaultMonth={value?.from}
          numberOfMonths={numberOfMonths}
          locale={locale}
          disabled={disabledDays}
          captionLayout={captionLayout}
          startMonth={startMonth}
          endMonth={endMonth}
          autoFocus
          onSelect={(r) => { setInner(r); onValueChange?.(r); }}
        />
      </PopoverContent>
    </Popover>
  );
}

export type { DateRange };
