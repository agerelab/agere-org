"use client";

import * as React from "react";

import type { CalendarItem, CalendarItemMove, CalendarSegment } from "./types";

export interface CalendarContextValue {
  month: Date;
  setMonth: (month: Date) => void;
  gridStart: Date;
  weekStartsOn: 0 | 1;
  weeks: CalendarSegment[][];
  items: CalendarItem[];
  maxVisibleItems: number;
  readOnly: boolean;
  locale: string;
  onItemClick?: (itemId: string) => void;
  onItemMove?: (move: CalendarItemMove) => void;
  onQuickAdd?: (date: string) => void;
}

export const CalendarContext = React.createContext<CalendarContextValue | null>(null);

export function useCalendar(): CalendarContextValue {
  const ctx = React.useContext(CalendarContext);
  if (!ctx) throw new Error("Calendar compound components must be rendered inside <Calendar>.");
  return ctx;
}
