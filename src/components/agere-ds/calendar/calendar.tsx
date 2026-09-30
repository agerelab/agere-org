"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { addMonths, diffInDays, shiftDateKey, startOfGrid } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { DatabaseToolbarActions } from "../shared/database-toolbar";
import { ViewSwitcher, type AgereDatabaseView } from "../shared/view-switcher";
import { CalendarContext, useCalendar, type CalendarContextValue } from "./calendar-context";
import { CalendarEventChip } from "./calendar-event";
import { layoutWeeks } from "./layout";
import type { CalendarItem, CalendarItemMove, CalendarSegment } from "./types";

/* ================================================================== */
/* <Calendar> root                                                     */
/* ================================================================== */

export interface CalendarProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  items: CalendarItem[];
  /** Controlled visible month (any date inside it). */
  month?: Date;
  defaultMonth?: Date;
  onMonthChange?: (month: Date) => void;
  weekStartsOn?: 0 | 1;
  /** Lanes shown per day before collapsing into “+ N more”. */
  maxVisibleItems?: number;
  readOnly?: boolean;
  locale?: string;
  onItemClick?: (itemId: string) => void;
  /** Fired after a drop. Duration is preserved. */
  onItemMove?: (move: CalendarItemMove) => void;
  onQuickAdd?: (date: string) => void;
  children: React.ReactNode;
}

const cellCollision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : closestCenter(args);
};

export const Calendar = React.forwardRef<HTMLElement, CalendarProps>(
  (
    {
      items,
      month: monthProp,
      defaultMonth,
      onMonthChange,
      weekStartsOn = 1,
      maxVisibleItems = 3,
      readOnly = false,
      locale = "en-US",
      onItemClick,
      onItemMove,
      onQuickAdd,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [innerMonth, setInnerMonth] = React.useState(() => defaultMonth ?? new Date());
    const month = monthProp ?? innerMonth;
    const setMonth = React.useCallback(
      (next: Date) => {
        if (!monthProp) setInnerMonth(next);
        onMonthChange?.(next);
      },
      [monthProp, onMonthChange]
    );

    const gridStart = React.useMemo(() => startOfGrid(month, weekStartsOn), [month, weekStartsOn]);
    const weeks = React.useMemo(() => layoutWeeks(items, gridStart, 6), [items, gridStart]);

    /* ---- Drag & drop ------------------------------------------------ */
    const cellSize = React.useRef({ w: 120, h: 120 });
    const coordinateGetter: KeyboardCoordinateGetter = React.useCallback((event, { currentCoordinates }) => {
      const { w, h } = cellSize.current;
      switch (event.code) {
        case "ArrowRight": return { ...currentCoordinates, x: currentCoordinates.x + w };
        case "ArrowLeft": return { ...currentCoordinates, x: currentCoordinates.x - w };
        case "ArrowDown": return { ...currentCoordinates, y: currentCoordinates.y + h };
        case "ArrowUp": return { ...currentCoordinates, y: currentCoordinates.y - h };
        default: return undefined;
      }
    }, []);

    const sensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
      useSensor(KeyboardSensor, { coordinateGetter })
    );
    const [dragging, setDragging] = React.useState<CalendarSegment | null>(null);

    const handleDragStart = ({ active }: DragStartEvent) => {
      const seg = active.data.current?.segment as CalendarSegment | undefined;
      setDragging(seg ?? null);
      const cell = document.querySelector<HTMLElement>("[data-agere-calendar-cell]");
      if (cell) cellSize.current = { w: cell.offsetWidth, h: cell.offsetHeight };
    };

    const handleDragEnd = ({ active, over }: DragEndEvent) => {
      setDragging(null);
      const seg = active.data.current?.segment as CalendarSegment | undefined;
      const target = over?.data.current?.date as string | undefined;
      if (!seg || !target || readOnly) return;
      const delta = diffInDays(seg.anchorDate, target);
      if (delta === 0) return;
      onItemMove?.({
        itemId: seg.item.id,
        startDate: shiftDateKey(seg.item.startDate, delta),
        endDate: seg.item.endDate ? shiftDateKey(seg.item.endDate, delta) : undefined,
      });
    };

    const ctx: CalendarContextValue = {
      month, setMonth, gridStart, weekStartsOn, weeks, items,
      maxVisibleItems, readOnly, locale, onItemClick, onItemMove, onQuickAdd,
    };

    return (
      <CalendarContext.Provider value={ctx}>
        <DndContext
          sensors={sensors}
          collisionDetection={cellCollision}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setDragging(null)}
          accessibility={{
            screenReaderInstructions: {
              draggable: "To move an item, press Space. Use arrow keys to change the date, Space to drop, Escape to cancel.",
            },
            announcements: {
              onDragStart: ({ active }) => `Picked up ${(active.data.current?.segment as CalendarSegment)?.item.title ?? "item"}.`,
              onDragOver: ({ over }) => (over ? `Over ${over.data.current?.label ?? over.id}.` : "Not over a date."),
              onDragEnd: ({ over }) => (over ? `Moved to ${over.data.current?.label ?? over.id}.` : "Dropped outside the calendar."),
              onDragCancel: () => "Move cancelled.",
            },
          }}
        >
          <section
            ref={ref}
            data-agere-component="calendar"
            aria-label="Calendar"
            className={cn("flex min-h-0 flex-col overflow-hidden rounded-xl border bg-background text-foreground", className)}
            {...props}
          >
            {children}
          </section>
          <DragOverlay dropAnimation={null}>
            {dragging ? <CalendarEventChip segment={{ ...dragging, span: 1, continuesBefore: false, continuesAfter: false }} overlay /> : null}
          </DragOverlay>
        </DndContext>
      </CalendarContext.Provider>
    );
  }
);
Calendar.displayName = "Calendar";

/* ================================================================== */
/* <CalendarHeader>                                                    */
/* ================================================================== */

export interface CalendarHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title?: React.ReactNode;
  view?: AgereDatabaseView;
  onViewChange?: (view: AgereDatabaseView) => void;
  searchValue?: string;
  onSearchChange?: (query: string) => void;
  onFilterClick?: () => void;
  onSortClick?: () => void;
  onNewClick?: () => void;
}

export const CalendarHeader = React.forwardRef<HTMLElement, CalendarHeaderProps>(
  ({ title, view = "calendar", onViewChange, searchValue, onSearchChange, onFilterClick, onSortClick, onNewClick, className, children, ...props }, ref) => {
    const { month, setMonth, locale, readOnly } = useCalendar();
    const label = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(month);

    return (
      <header ref={ref} className={cn("shrink-0 border-b bg-card", className)} {...props}>
        <div className="flex min-h-14 flex-wrap items-center gap-2 px-4 py-2">
          <div className="flex min-w-0 items-center gap-1">
            {title && <span className="mr-2 text-sm font-semibold">{title}</span>}
            <h2 className="min-w-[9.5rem] text-sm font-semibold tabular-nums" aria-live="polite">{label}</h2>
            <Button variant="ghost" size="icon-sm" onClick={() => setMonth(addMonths(month, -1))} aria-label="Previous month">
              <ChevronLeft aria-hidden />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setMonth(new Date())}>Today</Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month">
              <ChevronRight aria-hidden />
            </Button>
          </div>
          <div className="flex-1" />
          {onViewChange && <ViewSwitcher value={view} onValueChange={onViewChange} label="Calendar views" />}
          <DatabaseToolbarActions
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            searchLabel="Search pages"
            onFilterClick={onFilterClick}
            onSortClick={onSortClick}
          />
          {children}
          {!readOnly && onNewClick && (
            <Button shape="pill" onClick={onNewClick}>
              <Plus aria-hidden /> New
            </Button>
          )}
        </div>
      </header>
    );
  }
);
CalendarHeader.displayName = "CalendarHeader";

export { CalendarGrid } from "./calendar-grid";
