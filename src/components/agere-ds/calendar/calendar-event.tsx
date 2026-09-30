"use client";

import * as React from "react";
import { useDraggable } from "@dnd-kit/core";

import { cn } from "@/lib/utils";
import { STATUS_DOT_CLASS } from "@/lib/agere-tokens";
import { useCalendar } from "./calendar-context";
import type { CalendarSegment } from "./types";

/* ------------------------------------------------------------------ */
/* CalendarEventChip — presentational                                  */
/* ------------------------------------------------------------------ */

export interface CalendarEventChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  segment: CalendarSegment;
  overlay?: boolean;
}

export const CalendarEventChip = React.forwardRef<HTMLButtonElement, CalendarEventChipProps>(
  ({ segment, overlay, className, style, ...props }, ref) => {
    const { item, continuesBefore, continuesAfter } = segment;
    const multiDay = !!item.endDate && item.endDate !== item.startDate;
    const range = multiDay ? `, ${item.startDate} to ${item.endDate}` : "";
    const tags = item.tags ?? [];

    return (
      <button
        ref={ref}
        type="button"
        aria-label={`${item.title}${range}${tags.length ? `, ${tags.map((t) => t.label).join(", ")}` : ""}`}
        title={item.title}
        style={style}
        className={cn(
          "pointer-events-auto relative flex h-6 min-w-0 items-center gap-1.5 overflow-hidden border bg-card px-2 text-left text-xs font-medium text-foreground",
          "transition-colors duration-fast hover:border-border-strong hover:bg-surface-hover",
          "focus-visible:z-10 focus-ring",
          continuesBefore ? "rounded-l-none border-l-0" : "rounded-l-md",
          continuesAfter ? "rounded-r-none border-r-0" : "rounded-r-md",
          overlay && "w-40 cursor-grabbing rounded-md border-border-strong shadow-2xl",
          className
        )}
        {...props}
      >
        {multiDay && !continuesBefore && <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-brand" />}
        {continuesBefore && <span aria-hidden className="text-muted-foreground">‹</span>}
        <span className="min-w-0 flex-1 truncate">{item.title}</span>
        {tags.length > 0 && (
          <span aria-hidden className="flex shrink-0 items-center gap-0.5">
            {tags.slice(0, 3).map((t) => (
              <span key={t.id} className={cn("size-1.5 rounded-full", STATUS_DOT_CLASS[t.status])} />
            ))}
          </span>
        )}
        {continuesAfter && <span aria-hidden className="text-muted-foreground">›</span>}
      </button>
    );
  }
);
CalendarEventChip.displayName = "CalendarEventChip";

/* ------------------------------------------------------------------ */
/* CalendarEvent — draggable, placed on the week lane grid              */
/* ------------------------------------------------------------------ */

export interface CalendarEventProps extends Omit<CalendarEventChipProps, "overlay"> {}

export const CalendarEvent = React.forwardRef<HTMLButtonElement, CalendarEventProps>(({ segment, style, onClick, ...props }, ref) => {
  const { readOnly, onItemClick } = useCalendar();
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: `${segment.item.id}@${segment.weekIndex}`,
    data: { segment },
    disabled: readOnly,
  });

  const mergedRef = React.useCallback(
    (node: HTMLButtonElement | null) => {
      setNodeRef(node);
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref, setNodeRef]
  );

  return (
    <CalendarEventChip
      ref={mergedRef}
      segment={segment}
      {...attributes}
      {...listeners}
      aria-roledescription={readOnly ? undefined : "draggable page"}
      onClick={(e) => {
        onClick?.(e);
        onItemClick?.(segment.item.id);
      }}
      style={{
        gridColumn: `${segment.startCol + 1} / span ${segment.span}`,
        gridRow: segment.lane + 1,
        ...style,
      }}
      className={cn(isDragging && "opacity-40")}
      {...props}
    />
  );
});
CalendarEvent.displayName = "CalendarEvent";
