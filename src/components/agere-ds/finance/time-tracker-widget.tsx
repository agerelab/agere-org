"use client";

import * as React from "react";
import { Pause, Play, Plus, Timer, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatClock, formatDuration } from "@/lib/workspace";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface TimeEntry {
  id: string;
  /** Minutes */
  minutes: number;
  note?: string;
  /** ISO */
  at: string;
  source: "timer" | "manual";
}

export interface TimeTrackerWidgetProps {
  taskTitle: string;
  /** Minutes already logged (excluding the running timer). */
  entries: TimeEntry[];
  /** Estimate in minutes. */
  estimate?: number;
  /** ISO start time when a timer is running (controlled). */
  runningSince?: string | null;
  onStart: () => void;
  /** Called with the elapsed minutes when the timer stops. */
  onStop: (minutes: number) => void;
  onAddManual: (entry: { minutes: number; note?: string }) => void;
  onDeleteEntry?: (id: string) => void;
  variant?: "card" | "bar";
  className?: string;
}

/** Parses "1h 30m", "90m", "1.5h", "1:30" into minutes. */
export function parseDurationInput(s: string): number | null {
  const t = s.trim().toLowerCase();
  if (!t) return null;
  const colon = /^(\d+):(\d{1,2})$/.exec(t);
  if (colon) return Number(colon[1]) * 60 + Number(colon[2]);
  const hm = /^(?:(\d+(?:[.,]\d+)?)\s*h)?\s*(?:(\d+)\s*m)?$/.exec(t);
  if (hm && (hm[1] || hm[2])) return Math.round(Number((hm[1] ?? "0").replace(",", ".")) * 60 + Number(hm[2] ?? 0));
  if (/^\d+$/.test(t)) return Number(t);
  return null;
}

function useElapsed(since?: string | null) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!since) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [since]);
  return since ? Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000)) : 0;
}

/**
 * ClickUp time tracker: start/stop timer, manual entry ("1h 30m"), estimate comparison
 * and entry history. `variant="bar"` renders the compact inline control for task headers.
 * The running clock is aria-hidden; state changes are announced once (not every second).
 */
export function TimeTrackerWidget({
  taskTitle, entries, estimate, runningSince, onStart, onStop, onAddManual, onDeleteEntry, variant = "card", className,
}: TimeTrackerWidgetProps) {
  const running = !!runningSince;
  const elapsed = useElapsed(runningSince);
  const logged = entries.reduce((s, e) => s + e.minutes, 0);
  const total = logged + Math.floor(elapsed / 60);
  const pct = estimate ? Math.round((total / estimate) * 100) : undefined;
  const over = pct !== undefined && pct > 100;
  const [announce, setAnnounce] = React.useState("");
  const [manual, setManual] = React.useState("");
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string>();
  const [open, setOpen] = React.useState(false);
  const manualId = React.useId();

  const toggle = () => {
    if (running) { onStop(Math.max(1, Math.round(elapsed / 60))); setAnnounce(`Timer stopped. ${formatDuration(Math.max(1, Math.round(elapsed / 60)))} logged.`); }
    else { onStart(); setAnnounce(`Timer started for ${taskTitle}.`); }
  };
  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    const m = parseDurationInput(manual);
    if (!m) return setError("Use a format like 1h 30m, 45m or 1:30.");
    onAddManual({ minutes: m, note: note || undefined });
    setAnnounce(`${formatDuration(m)} added.`);
    setManual(""); setNote(""); setError(undefined); setOpen(false);
  };

  const timerButton = (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={running}
      aria-label={running ? `Stop timer for ${taskTitle}` : `Start timer for ${taskTitle}`}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full shadow-xs transition-colors focus-ring",
        variant === "bar" ? "size-7" : "size-10",
        running ? "bg-error-solid text-error-on-solid hover:bg-error-solid/90" : "bg-success-solid text-success-on-solid hover:bg-success-solid/90"
      )}
    >
      {running ? <Pause aria-hidden className={variant === "bar" ? "size-3.5" : "size-4"} fill="currentColor" /> : <Play aria-hidden className={cn(variant === "bar" ? "size-3.5" : "size-4", "translate-x-px")} fill="currentColor" />}
    </button>
  );

  const manualForm = (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size={variant === "bar" ? "xs" : "sm"} leadingIcon={<Plus />}>Add time</Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <form onSubmit={submitManual} className="grid gap-3" noValidate>
          <div className="grid gap-1.5">
            <label htmlFor={manualId} className="text-sm font-medium text-emphasis">Time spent</label>
            <Input size="md" id={manualId} autoFocus placeholder="1h 30m" value={manual} onChange={(e) => setManual(e.target.value)} aria-invalid={!!error} aria-describedby={error ? `${manualId}-e` : `${manualId}-h`} />
            {error ? <p id={`${manualId}-e`} className="text-xs text-error-on-surface">{error}</p> : <p id={`${manualId}-h`} className="text-xs text-subtle">Formats: 1h 30m · 45m · 1:30</p>}
          </div>
          <Input size="md" aria-label="Note (optional)" placeholder="What did you work on? (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button size="sm" type="submit">Add</Button></div>
        </form>
      </PopoverContent>
    </Popover>
  );

  if (variant === "bar") {
    return (
      <div className={cn("inline-flex items-center gap-2 rounded-control border border-subtle bg-default py-1 pl-1 pr-2", className)}>
        {timerButton}
        <span aria-hidden className={cn("font-mono text-sm tabular-nums", running ? "text-emphasis" : "text-subtle")}>{running ? formatClock(elapsed) : formatDuration(logged)}</span>
        {estimate ? <span className={cn("text-xs tabular-nums", over ? "text-error-on-surface" : "text-subtle")}>/ {formatDuration(estimate)}</span> : null}
        {manualForm}
        <span role="status" className="sr-only">{announce}</span>
      </div>
    );
  }

  return (
    <section aria-label={`Time tracking for ${taskTitle}`} className={cn("grid gap-4 rounded-xl border border-subtle bg-default p-5 shadow-elevation-1", className)}>
      <div className="flex items-center gap-4">
        {timerButton}
        <div className="grid min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs text-subtle"><Timer aria-hidden className="size-3.5" />{running ? "Tracking now" : "Total tracked"}</p>
          <p aria-hidden className="font-mono text-2xl font-semibold tabular-nums text-emphasis">{running ? formatClock(logged * 60 + elapsed) : formatClock(logged * 60)}</p>
          <p className="sr-only">{formatDuration(total)} tracked{estimate ? ` of ${formatDuration(estimate)} estimated` : ""}</p>
        </div>
        {manualForm}
      </div>
      {estimate ? (
        <div className="grid gap-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-subtle">Estimate <span className="font-medium text-emphasis">{formatDuration(estimate)}</span></span>
            <span className={cn("font-medium tabular-nums", over ? "text-error-on-surface" : "text-subtle")}>{over ? `${formatDuration(total - estimate)} over` : `${formatDuration(estimate - total)} left`}</span>
          </div>
          <Progress value={Math.min(pct!, 100)} tone={over ? "destructive" : pct! > 80 ? "attention" : "default"} aria-label={`${pct}% of estimate used`} size="md" />
        </div>
      ) : null}
      {entries.length > 0 && (
        <ul aria-label="Time entries" className="grid divide-y divide-[hsl(var(--ag-border-subtle))] rounded-lg border border-subtle">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="w-16 font-medium tabular-nums text-emphasis">{formatDuration(e.minutes)}</span>
              <span className="min-w-0 flex-1 truncate text-default">{e.note ?? (e.source === "timer" ? "Timer" : "Manual entry")}</span>
              <time dateTime={e.at} className="text-xs text-subtle tabular-nums">{new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(e.at))}</time>
              {onDeleteEntry && (
                <button type="button" aria-label={`Delete ${formatDuration(e.minutes)} entry`} onClick={() => onDeleteEntry(e.id)} className="inline-flex size-6 items-center justify-center rounded-md text-subtle hover:bg-subtle hover:text-error-fg focus-ring"><Trash2 aria-hidden className="size-3.5" /></button>
              )}
            </li>
          ))}
        </ul>
      )}
      <span role="status" className="sr-only">{announce}</span>
    </section>
  );
}
