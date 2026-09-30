import type { AgerePropertyTag } from "@/lib/agere-tokens";

export interface CalendarItem {
  id: string;
  title: string;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD, inclusive. Omit for single-day items. */
  endDate?: string;
  tags?: AgerePropertyTag[];
  description?: string;
  metadata?: Record<string, string>;
}

export interface CalendarItemMove {
  itemId: string;
  startDate: string;
  endDate?: string;
}

/** One horizontal slice of an item inside a single week row. */
export interface CalendarSegment {
  item: CalendarItem;
  weekIndex: number;
  /** 0–6 column within the week. */
  startCol: number;
  /** Number of columns covered in this week (1–7). */
  span: number;
  lane: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
  /** First date this segment covers (used as the drag anchor). */
  anchorDate: string;
}
