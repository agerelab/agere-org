import { addDays, diffInDays, toDateKey } from "@/lib/date";
import type { CalendarItem, CalendarSegment } from "./types";

/**
 * Splits items into per-week segments and packs them into lanes
 * (greedy interval scheduling, longest first) so multi-day bars
 * never overlap and keep the same lane across their whole week.
 */
export function layoutWeeks(items: CalendarItem[], gridStart: Date, weeks = 6): CalendarSegment[][] {
  const result: CalendarSegment[][] = [];

  for (let w = 0; w < weeks; w++) {
    const weekStart = toDateKey(addDays(gridStart, w * 7));
    const weekEnd = toDateKey(addDays(gridStart, w * 7 + 6));

    const raw = items
      .filter((item) => item.startDate <= weekEnd && (item.endDate ?? item.startDate) >= weekStart)
      .map((item) => {
        const end = item.endDate && item.endDate >= item.startDate ? item.endDate : item.startDate;
        const segStart = item.startDate < weekStart ? weekStart : item.startDate;
        const segEnd = end > weekEnd ? weekEnd : end;
        return {
          item,
          weekIndex: w,
          startCol: diffInDays(weekStart, segStart),
          span: diffInDays(segStart, segEnd) + 1,
          lane: 0,
          continuesBefore: item.startDate < weekStart,
          continuesAfter: end > weekEnd,
          anchorDate: segStart,
        } satisfies CalendarSegment;
      })
      .sort((a, b) => a.startCol - b.startCol || b.span - a.span || a.item.title.localeCompare(b.item.title));

    const laneEnds: number[] = [];
    for (const seg of raw) {
      let lane = laneEnds.findIndex((end) => end < seg.startCol);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = seg.startCol + seg.span - 1;
      seg.lane = lane;
    }
    result.push(raw);
  }
  return result;
}

/** Items (in lane order) that touch a given column of a week. */
export function segmentsForDay(week: CalendarSegment[], col: number): CalendarSegment[] {
  return week.filter((s) => s.startCol <= col && s.startCol + s.span - 1 >= col).sort((a, b) => a.lane - b.lane);
}
