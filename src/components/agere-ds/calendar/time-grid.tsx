"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Globe, Video } from "lucide-react";

import { cn } from "@/lib/utils";
import { addDays, addMonths, isSameMonth, parseDateKey, startOfGrid, toDateKey } from "@/lib/date";
import { TASK_STATUS_META, type TaskStatus, type WorkspaceMember } from "@/lib/workspace";
import { AssigneeStack, StatusIndicator } from "../workspace/task-fields";

/* ================================================================== */
/* Event model + EventCard                                             */
/* ================================================================== */
export type EventTone = "brand" | "info" | "success" | "attention" | "error" | "special";
export interface TimedEvent {
  id: string;
  title: string;
  /** ISO local datetime "2026-09-24T09:30" */
  start: string;
  end: string;
  kind?: "meeting" | "task" | "focus";
  tone?: EventTone;
  /** When the event is a scheduled task. */
  status?: TaskStatus;
  attendees?: WorkspaceMember[];
  location?: string;
}

const TONE: Record<EventTone, string> = {
  brand: "bg-brand-subtle border-l-brand text-emphasis",
  info: "bg-info-bg border-l-info-solid text-info-fg",
  success: "bg-success-bg border-l-success-solid text-success-fg",
  attention: "bg-attention-bg border-l-attention-solid text-attention-fg",
  error: "bg-error-bg border-l-error-solid text-error-fg",
  special: "bg-special-bg border-l-special-solid text-special-fg",
};
const fmtCache = new Map<string, Intl.DateTimeFormat>();
/** Time formatter per locale (cached). Default "id-ID" keeps pre-6.3 output unchanged. */
const fmtT = (locale = "id-ID") => {
  let f = fmtCache.get(locale);
  if (!f) { f = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }); fmtCache.set(locale, f); }
  return f;
};
const mins = (iso: string) => { const d = new Date(iso); return d.getHours() * 60 + d.getMinutes(); };

export interface EventCardProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  event: TimedEvent;
  compact?: boolean;
  /** BCP 47 locale for the time range. Default "id-ID". */
  locale?: string;
}

/** Timeline event / scheduled task block. Always a button whose name includes the time range. */
export const EventCard = React.forwardRef<HTMLButtonElement, EventCardProps>(({ event: e, compact, locale, className, style, ...props }, ref) => {
  const range = `${fmtT(locale).format(new Date(e.start))}–${fmtT(locale).format(new Date(e.end))}`;
  return (
    <button
      ref={ref}
      type="button"
      aria-label={`${e.title}, ${range}${e.status ? `, task ${TASK_STATUS_META[e.status].label}` : ""}${e.location ? `, ${e.location}` : ""}`}
      style={style}
      className={cn(
        "flex w-full min-w-0 flex-col overflow-hidden rounded-md border-l-[3px] px-2 py-1 text-left text-xs shadow-elevation-1 transition-shadow hover:shadow-elevation-2 focus-ring",
        TONE[e.tone ?? (e.kind === "task" ? "info" : "brand")],
        e.kind === "focus" && "bg-[repeating-linear-gradient(135deg,transparent_0_6px,hsl(var(--ag-bg-emphasis)/0.6)_6px_8px)]",
        className
      )}
      {...props}
    >
      <span className="flex min-w-0 items-center gap-1 font-semibold leading-4">
        {e.status && <StatusIndicator status={e.status} size={12} />}
        <span className="truncate">{e.title}</span>
      </span>
      {!compact && (
        <span className="mt-0.5 flex items-center gap-1 leading-4 opacity-80 tabular-nums">
          {range}
          {e.location && <><Video aria-hidden className="ml-1 size-3" /><span className="truncate">{e.location}</span></>}
        </span>
      )}
      {!compact && e.attendees && e.attendees.length > 0 && <AssigneeStack members={e.attendees} max={3} size="xs" className="mt-1" />}
    </button>
  );
});
EventCard.displayName = "EventCard";

/* ================================================================== */
/* CalendarTimeGrid — Week / Day                                       */
/* ================================================================== */
export interface CalendarTimeGridProps {
  view: "week" | "day";
  /** Any date in the week (week view) or the day (day view). YYYY-MM-DD */
  date: string;
  events: TimedEvent[];
  startHour?: number;
  endHour?: number;
  weekStartsOn?: 0 | 1;
  hourHeight?: number;
  /** BCP 47 locale for weekday names, dates and times. Default "id-ID" (unchanged from earlier versions). */
  locale?: string;
  now?: Date;
  onEventClick?: (id: string) => void;
  /** Empty-slot click (30-min resolution). */
  onSlotClick?: (isoStart: string) => void;
  className?: string;
}

function layoutDay(events: TimedEvent[]) {
  const sorted = [...events].sort((a, b) => mins(a.start) - mins(b.start));
  const lanes: number[] = [];
  const placed = sorted.map((e) => {
    let lane = lanes.findIndex((end) => end <= mins(e.start));
    if (lane === -1) { lane = lanes.length; lanes.push(0); }
    lanes[lane] = mins(e.end);
    return { e, lane };
  });
  return placed.map((p) => ({ ...p, lanes: lanes.length }));
}

export function CalendarTimeGrid({
  view, date, events, startHour = 7, endHour = 20, weekStartsOn = 1, hourHeight = 48, now = new Date(), onEventClick, onSlotClick, locale = "id-ID", className,
}: CalendarTimeGridProps) {
  const anchor = parseDateKey(date);
  const first = view === "day" ? anchor : addDays(anchor, -((anchor.getDay() - weekStartsOn + 7) % 7));
  const days = Array.from({ length: view === "day" ? 1 : 7 }, (_, i) => addDays(first, i));
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const todayKey = toDateKey(now);
  const nowTop = ((now.getHours() * 60 + now.getMinutes() - startHour * 60) / 60) * hourHeight;
  const fmtDow = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const fmtFull = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" });
  const hourLabel = (h: number) => fmtT(locale).format(new Date(2000, 0, 1, h, 0));

  return (
    <div className={cn("min-h-0 overflow-auto rounded-xl border border-subtle bg-default", className)}>
      <div className="grid min-w-[640px]" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0,1fr))` }}>
        <div className="sticky top-0 z-[3] border-b border-subtle bg-default" />
        {days.map((d) => {
          const k = toDateKey(d);
          const isToday = k === todayKey;
          return (
            <div key={k} className="sticky top-0 z-[3] flex flex-col items-center gap-0.5 border-b border-l border-subtle bg-default py-2">
              <span className={cn("text-2xs font-medium uppercase tracking-wide", isToday ? "text-emphasis" : "text-subtle")}>{fmtDow.format(d)}</span>
              <span aria-current={isToday ? "date" : undefined} className={cn("grid size-8 place-items-center rounded-full font-sans tracking-tight text-lg font-semibold tabular-nums", isToday ? "bg-brand text-brand-fg" : "text-emphasis")}>
                {d.getDate()}
              </span>
            </div>
          );
        })}

        <div className="relative">
          {hours.map((h) => (
            <div key={h} style={{ height: hourHeight }} className="relative pr-2 text-right">
              <span className="absolute -top-2 right-2 text-2xs text-subtle tabular-nums">{h === startHour ? "" : hourLabel(h)}</span>
            </div>
          ))}
        </div>
        {days.map((d) => {
          const k = toDateKey(d);
          const dayEvents = layoutDay(events.filter((e) => e.start.slice(0, 10) === k));
          return (
            <div key={k} role="group" aria-label={fmtFull.format(d)} className="relative border-l border-subtle">
              {hours.map((h) => (
                <div key={h} style={{ height: hourHeight }} className="border-t border-subtle">
                  {onSlotClick && [0, 30].map((m) => (
                    <button
                      key={m}
                      type="button"
                      tabIndex={-1}
                      aria-hidden
                      onClick={() => onSlotClick(`${k}T${String(h).padStart(2, "0")}:${m ? "30" : "00"}`)}
                      style={{ height: hourHeight / 2 }}
                      className="block w-full hover:bg-subtle/60"
                    />
                  ))}
                </div>
              ))}
              {k === todayKey && nowTop >= 0 && nowTop <= hours.length * hourHeight && (
                <div aria-hidden className="pointer-events-none absolute inset-x-0 z-[2] flex items-center" style={{ top: nowTop }}>
                  <span className="-ml-1 size-2 rounded-full bg-error-solid" /><span className="h-0.5 flex-1 bg-error-solid" />
                </div>
              )}
              {dayEvents.map(({ e, lane, lanes }) => {
                const top = ((mins(e.start) - startHour * 60) / 60) * hourHeight;
                const height = Math.max(((mins(e.end) - mins(e.start)) / 60) * hourHeight - 2, 20);
                return (
                  <EventCard
                    key={e.id}
                    event={e}
                    locale={locale}
                    compact={height < 44}
                    onClick={() => onEventClick?.(e.id)}
                    className="absolute z-[1]"
                    style={{ top: top + 1, height, left: `calc(${(lane / lanes) * 100}% + 2px)`, width: `calc(${100 / lanes}% - 4px)` }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/* TimeSlotPicker — cal.com booker                                     */
/* ================================================================== */
export interface TimeSlotPickerProps {
  /** Month to display initially (YYYY-MM-DD, any day in the month). */
  month: string;
  /** Returns available "HH:MM" slots for a date; empty = unavailable. */
  getSlots: (dateKey: string) => string[];
  value?: { date: string; time?: string };
  onChange: (v: { date: string; time?: string }) => void;
  timezone?: string;
  durationLabel?: string;
  weekStartsOn?: 0 | 1;
  className?: string;
}

export function TimeSlotPicker({ month, getSlots, value, onChange, timezone = "Asia/Jakarta (WIB)", durationLabel, weekStartsOn = 1, className }: TimeSlotPickerProps) {
  const [cursor, setCursor] = React.useState(() => parseDateKey(month));
  const [h24, setH24] = React.useState(true);
  const gridStart = startOfGrid(cursor, weekStartsOn);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const today = toDateKey(new Date());
  const fmtMonth = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" });
  const fmtDay = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long" });
  const dow = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(addDays(gridStart, i)));
  const slots = value?.date ? getSlots(value.date) : [];
  const fmtSlot = (t: string) => {
    if (h24) return t.replace(":", ".");
    const [h, m] = t.split(":").map(Number);
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  };

  return (
    <div className={cn("grid overflow-hidden rounded-xl border border-border bg-card shadow-sm md:grid-cols-[1fr_220px]", className)}>
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="type-heading-sm capitalize" aria-live="polite">{fmtMonth.format(cursor)}</h3>
          <div className="flex gap-1">
            <button type="button" aria-label="Previous month" onClick={() => setCursor(addMonths(cursor, -1))} className="inline-flex size-8 items-center justify-center rounded-control text-subtle hover:bg-subtle focus-ring"><ChevronLeft aria-hidden className="size-4" /></button>
            <button type="button" aria-label="Next month" onClick={() => setCursor(addMonths(cursor, 1))} className="inline-flex size-8 items-center justify-center rounded-control text-subtle hover:bg-subtle focus-ring"><ChevronRight aria-hidden className="size-4" /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {dow.map((d) => <span key={d} aria-hidden className="pb-1 text-2xs font-medium uppercase text-subtle">{d}</span>)}
          {cells.map((d) => {
            const k = toDateKey(d);
            const inMonth = isSameMonth(d, cursor);
            const available = inMonth && k >= today && getSlots(k).length > 0;
            const selected = value?.date === k;
            if (!inMonth) return <span key={k} aria-hidden />;
            return (
              <button
                key={k}
                type="button"
                disabled={!available}
                aria-pressed={selected}
                aria-label={`${fmtDay.format(d)}${available ? "" : ", unavailable"}`}
                aria-current={k === today ? "date" : undefined}
                onClick={() => onChange({ date: k })}
                className={cn(
                  "relative grid aspect-square place-items-center rounded-lg text-sm font-medium tabular-nums transition-colors focus-ring",
                  selected ? "bg-brand text-brand-fg" : available ? "bg-emphasis text-emphasis hover:ring-1 hover:ring-[hsl(var(--ag-brand-default))]" : "text-muted",
                  "disabled:cursor-not-allowed"
                )}
              >
                {d.getDate()}
                {k === today && <span aria-hidden className={cn("absolute bottom-1 size-1 rounded-full", selected ? "bg-brand-fg" : "bg-brand")} />}
              </button>
            );
          })}
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-xs text-subtle"><Globe aria-hidden className="size-3.5" />{timezone}{durationLabel && <> · {durationLabel}</>}</p>
      </div>
      <div className="flex min-h-[280px] flex-col border-t border-subtle md:border-l md:border-t-0">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <p className="text-sm font-semibold text-emphasis">{value?.date ? new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric" }).format(parseDateKey(value.date)) : "Pick a date"}</p>
          <div role="group" aria-label="Time format" className="flex rounded-md border border-subtle p-0.5 text-2xs">
            {[["12j", false], ["24j", true]].map(([l, v]) => (
              <button key={l as string} type="button" aria-pressed={h24 === v} onClick={() => setH24(v as boolean)} className={cn("rounded-sm px-1.5 py-0.5 font-medium focus-ring", h24 === v ? "bg-emphasis text-emphasis" : "text-subtle")}>{l as string}</button>
            ))}
          </div>
        </div>
        <ul aria-label="Available times" className="grid flex-1 content-start gap-2 overflow-y-auto px-4 pb-4">
          {value?.date && slots.length === 0 && <li className="text-sm text-subtle">No times left on this day.</li>}
          {slots.map((t) => {
            const on = value?.time === t;
            return (
              <li key={t}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => onChange({ date: value!.date, time: t })}
                  className={cn("h-10 w-full rounded-control border text-sm font-medium tabular-nums transition-colors focus-ring", on ? "border-brand bg-brand text-brand-fg" : "border-default bg-default text-emphasis hover:border-brand")}
                >
                  {fmtSlot(t)}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
