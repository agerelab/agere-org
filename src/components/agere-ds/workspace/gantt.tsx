"use client";

import { cn } from "@/lib/utils";
import { addDays, diffInDays, parseDateKey, toDateKey } from "@/lib/date";
import { TASK_STATUS_CLASS, TASK_STATUS_META, type WorkspaceTask } from "@/lib/workspace";
import { AssigneeStack, StatusIndicator } from "./task-fields";

export interface GanttChartProps {
  tasks: WorkspaceTask[];
  /** YYYY-MM-DD. Defaults to 3 days before the earliest task. */
  from?: string;
  /** Number of days to render. Default 42. */
  days?: number;
  zoom?: "day" | "week";
  /** "Today" marker; defaults to the real date. */
  today?: string;
  onTaskClick?: (id: string) => void;
  label?: string;
  className?: string;
}

const DAY_W = { day: 36, week: 14 } as const;
const fmtDay = new Intl.DateTimeFormat("en-US", { day: "numeric" });
const fmtMonth = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });
const fmtLong = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

/**
 * Gantt / timeline view. Left: sticky task column. Right: day grid with weekend shading,
 * a today line and status-colored bars (progress = subtasks). Each bar is a button whose
 * accessible name includes the date range and status.
 */
export function GanttChart({ tasks, from, days = 42, zoom = "day", today = toDateKey(new Date()), onTaskClick, label = "Timeline", className }: GanttChartProps) {
  const scheduled = tasks.filter((t) => t.startDate || t.dueDate);
  const start = from ?? toDateKey(addDays(parseDateKey(scheduled.map((t) => t.startDate ?? t.dueDate!).sort()[0] ?? today), -3));
  const w = DAY_W[zoom];
  const dates = Array.from({ length: days }, (_, i) => addDays(parseDateKey(start), i));
  const months: { label: string; span: number }[] = [];
  dates.forEach((d) => {
    const l = fmtMonth.format(d);
    const last = months[months.length - 1];
    if (last?.label === l) last.span += 1; else months.push({ label: l, span: 1 });
  });
  const todayIdx = diffInDays(start, today);

  return (
    <div className={cn("min-h-0 overflow-auto rounded-xl border border-subtle bg-default", className)}>
      <div className="grid min-w-max" style={{ gridTemplateColumns: `260px ${days * w}px` }}>
        {/* header */}
        <div className="sticky left-0 top-0 z-[3] flex h-14 items-end border-b border-r border-subtle bg-muted px-cell-x pb-2 text-2xs font-medium uppercase tracking-wide text-subtle">Task</div>
        <div aria-hidden className="sticky top-0 z-[2] border-b border-subtle bg-muted">
          <div className="flex h-7 border-b border-subtle">
            {months.map((m, i) => <div key={i} style={{ width: m.span * w }} className="truncate border-r border-subtle px-2 text-xs font-medium leading-7 text-emphasis">{m.label}</div>)}
          </div>
          <div className="flex h-7">
            {dates.map((d, i) => {
              const wk = d.getDay() === 0 || d.getDay() === 6;
              const show = zoom === "day" || d.getDay() === 1;
              return <div key={i} style={{ width: w }} className={cn("shrink-0 text-center text-2xs leading-7 tabular-nums", i === todayIdx ? "font-semibold text-brand" : wk ? "text-muted" : "text-subtle")}>{show ? fmtDay.format(d) : ""}</div>;
            })}
          </div>
        </div>

        {/* rows */}
        <ul aria-label={label} className="contents">
          {tasks.map((t) => {
            const s = t.startDate ?? t.dueDate;
            const e = t.dueDate ?? t.startDate;
            const offset = s ? diffInDays(start, s) : -1;
            const len = s && e ? diffInDays(s, e) + 1 : 0;
            const pct = t.subtasks?.total ? Math.round((t.subtasks.done / t.subtasks.total) * 100) : TASK_STATUS_META[t.status].done ? 100 : 0;
            const c = TASK_STATUS_CLASS[t.status];
            return (
              <li key={t.id} className="contents">
                <div className="sticky left-0 z-[1] flex h-row items-center gap-2 border-b border-r border-subtle bg-default px-cell-x text-dense">
                  <StatusIndicator status={t.status} />
                  <span className="min-w-0 flex-1 truncate font-medium text-emphasis">{t.title}</span>
                  <AssigneeStack members={t.assignees} max={2} size="xs" />
                </div>
                <div className="relative h-row border-b border-subtle">
                  <div aria-hidden className="absolute inset-0 flex">
                    {dates.map((d, i) => <div key={i} style={{ width: w }} className={cn("h-full shrink-0 border-r border-subtle/60", (d.getDay() === 0 || d.getDay() === 6) && "bg-muted")} />)}
                  </div>
                  {todayIdx >= 0 && todayIdx < days && <div aria-hidden className="absolute inset-y-0 z-[1] w-0.5 bg-brand/70" style={{ left: todayIdx * w + w / 2 }} />}
                  {len > 0 && offset + len > 0 && offset < days && (
                    <button
                      type="button"
                      onClick={() => onTaskClick?.(t.id)}
                      aria-label={`${t.title}: ${fmtLong.format(parseDateKey(s!))} to ${fmtLong.format(parseDateKey(e!))}, ${TASK_STATUS_META[t.status].label}${pct ? `, ${pct}% done` : ""}`}
                      className={cn("absolute top-1/2 z-[2] flex h-[calc(var(--ag-row-height)-14px)] min-h-5 -translate-y-1/2 items-center overflow-hidden rounded-md border text-left text-2xs font-medium shadow-elevation-1 focus-ring", c.bg, c.text, c.border)}
                      style={{ left: Math.max(offset, 0) * w + 2, width: Math.max(len * w - 4, w - 4) }}
                    >
                      <span aria-hidden className={cn("absolute inset-y-0 left-0 opacity-25", c.solid)} style={{ width: `${pct}%` }} />
                      <span className="relative truncate px-2">{zoom === "day" || len > 6 ? t.title : ""}</span>
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
