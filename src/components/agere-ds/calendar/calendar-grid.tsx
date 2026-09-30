"use client";

import * as React from "react";
import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { addDays, isSameMonth, parseDateKey, toDateKey } from "@/lib/date";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCalendar } from "./calendar-context";
import { CalendarEvent, CalendarEventChip } from "./calendar-event";
import { segmentsForDay } from "./layout";
import type { CalendarSegment } from "./types";

const HEADER_PX = 30;
const LANE_PX = 24;
const LANE_GAP_PX = 4;

/* ================================================================== */
/* CalendarGrid — weekday header + 6 week rows                          */
/* ================================================================== */

export const CalendarGrid = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { weeks, gridStart, locale } = useCalendar();
    const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
    const weekdayLong = new Intl.DateTimeFormat(locale, { weekday: "long" });
    const days = Array.from({ length: 7 }, (_, i) => addDays(gridStart, i));

    return (
      <div ref={ref} className={cn("flex min-h-0 flex-1 flex-col overflow-auto", className)} {...props}>
        <div className="sticky top-0 z-20 grid min-w-[720px] grid-cols-7 border-b bg-card">
          {days.map((d) => (
            <div key={d.getDay()} className="px-2 py-2 text-2xs font-medium text-muted-foreground">
              <abbr title={weekdayLong.format(d)} className="no-underline">{weekdayFmt.format(d)}</abbr>
            </div>
          ))}
        </div>
        <div className="grid min-w-[720px] flex-1 auto-rows-fr">
          {weeks.map((segments, w) => (
            <CalendarWeek key={w} weekIndex={w} segments={segments} />
          ))}
        </div>
      </div>
    );
  }
);
CalendarGrid.displayName = "CalendarGrid";

/* ================================================================== */
/* CalendarWeek — 7 droppable cells + an event lane layer               */
/* ================================================================== */

interface CalendarWeekProps {
  weekIndex: number;
  segments: CalendarSegment[];
}

function CalendarWeek({ weekIndex, segments }: CalendarWeekProps) {
  const { gridStart, maxVisibleItems } = useCalendar();
  const weekStart = addDays(gridStart, weekIndex * 7);
  const visible = segments.filter((s) => s.lane < maxVisibleItems);
  const minHeight = HEADER_PX + (maxVisibleItems + 1) * (LANE_PX + LANE_GAP_PX) + 6;

  return (
    <div className="relative grid grid-cols-7 border-b last:border-b-0" style={{ minHeight }}>
      {Array.from({ length: 7 }, (_, col) => (
        <CalendarCell key={col} date={addDays(weekStart, col)} />
      ))}

      <div
        className="pointer-events-none absolute inset-x-0 grid grid-cols-7 gap-y-1 px-1"
        style={{ top: HEADER_PX, gridAutoRows: `${LANE_PX}px` }}
      >
        {visible.map((seg) => (
          <CalendarEvent key={`${seg.item.id}@${weekIndex}`} segment={seg} className="mx-px" />
        ))}
        {Array.from({ length: 7 }, (_, col) => {
          const all = segmentsForDay(segments, col);
          const hidden = all.filter((s) => s.lane >= maxVisibleItems).length;
          if (!hidden) return null;
          return (
            <CalendarOverflow
              key={`more-${col}`}
              date={toDateKey(addDays(weekStart, col))}
              segments={all}
              hiddenCount={hidden}
              style={{ gridColumn: col + 1, gridRow: maxVisibleItems + 1 }}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/* CalendarCell — droppable date with hover quick-add                   */
/* ================================================================== */

export interface CalendarCellProps extends React.HTMLAttributes<HTMLDivElement> {
  date: Date;
}

export const CalendarCell = React.forwardRef<HTMLDivElement, CalendarCellProps>(({ date, className, ...props }, ref) => {
  const { month, readOnly, onQuickAdd, locale } = useCalendar();
  const key = toDateKey(date);
  const isToday = key === toDateKey(new Date());
  const inMonth = isSameMonth(date, month);
  const label = new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(date);
  const { setNodeRef, isOver } = useDroppable({ id: `cell:${key}`, data: { date: key, label }, disabled: readOnly });

  const mergedRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref, setNodeRef]
  );

  return (
    <div
      ref={mergedRef}
      data-agere-calendar-cell=""
      data-outside={!inMonth || undefined}
      data-over={isOver || undefined}
      className={cn(
        "group/cell relative border-r transition-colors duration-fast last:border-r-0",
        "data-[outside]:bg-card/40 hover:bg-foreground/[0.02]",
        "data-[over]:bg-brand/5 data-[over]:ring-1 data-[over]:ring-inset data-[over]:ring-brand/40",
        className
      )}
      {...props}
    >
      <div className="flex h-[30px] items-center justify-between px-1.5">
        <time
          dateTime={key}
          aria-current={isToday ? "date" : undefined}
          className={cn(
            "grid size-6 place-items-center rounded-full text-xs tabular-nums",
            inMonth ? "text-foreground/80" : "text-muted-foreground/60",
            isToday && "bg-brand font-semibold text-brand-fg"
          )}
        >
          {date.getDate()}
        </time>
        {!readOnly && onQuickAdd && (
          <button
            type="button"
            onClick={() => onQuickAdd(key)}
            aria-label={`Add page on ${label}`}
            className={cn(
              "grid size-6 place-items-center rounded-sm text-muted-foreground opacity-0 transition-opacity",
              "hover:bg-foreground/10 hover:text-foreground group-hover/cell:opacity-100",
              "focus-visible:opacity-100 focus-ring"
            )}
          >
            <Plus className="size-3.5" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
});
CalendarCell.displayName = "CalendarCell";

/* ================================================================== */
/* CalendarOverflow — “+ N more” Radix popover                          */
/* ================================================================== */

export interface CalendarOverflowProps extends React.HTMLAttributes<HTMLDivElement> {
  date: string;
  segments: CalendarSegment[];
  hiddenCount: number;
}

export const CalendarOverflow = React.forwardRef<HTMLDivElement, CalendarOverflowProps>(
  ({ date, segments, hiddenCount, className, ...props }, ref) => {
    const { locale, onItemClick } = useCalendar();
    const [open, setOpen] = React.useState(false);
    const heading = new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric" }).format(parseDateKey(date));

    return (
      <div ref={ref} className={cn("pointer-events-auto min-w-0 px-px", className)} {...props}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`${hiddenCount} more pages on ${heading}`}
              className="h-6 w-full truncate rounded-md px-2 text-left text-2xs font-medium text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground focus-ring"
            >
              + {hiddenCount} more
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72" aria-label={`Pages on ${heading}`}>
            <p className="px-1 pb-2 text-xs font-semibold">{heading}</p>
            <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
              {segments.map((seg) => (
                <li key={seg.item.id} className="flex">
                  <CalendarEventChip
                    segment={{ ...seg, continuesBefore: false, continuesAfter: false }}
                    className="w-full"
                    onClick={() => {
                      setOpen(false);
                      onItemClick?.(seg.item.id);
                    }}
                  />
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      </div>
    );
  }
);
CalendarOverflow.displayName = "CalendarOverflow";
