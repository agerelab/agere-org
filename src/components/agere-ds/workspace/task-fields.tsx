"use client";

import * as React from "react";
import { Calendar as CalendarIcon, Check, Flag, FlagOff, UserPlus, X } from "lucide-react";

import { cn, getInitials } from "@/lib/utils";
import { formatShortDate, isOverdue } from "@/lib/date";
import {
  TASK_PRIORITIES, TASK_PRIORITY_META, TASK_STATUSES, TASK_STATUS_CLASS, TASK_STATUS_META,
  type Presence, type TaskPriority, type TaskStatus, type WorkspaceMember,
} from "@/lib/workspace";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SearchInput } from "@/components/ui/input";

/* ================================================================== */
/* StatusIndicator — shape + color (never color alone)                 */
/* ================================================================== */
const SOLID_FILL: Record<TaskStatus, string> = {
  backlog: "text-task-status-backlog", todo: "text-task-status-todo", "in-progress": "text-task-status-in-progress",
  review: "text-task-status-review", blocked: "text-task-status-blocked", complete: "text-task-status-complete",
};

export interface StatusIndicatorProps extends React.SVGAttributes<SVGSVGElement> {
  status: TaskStatus;
  size?: number;
  /** Adds an accessible name (role=img). Omit when the status label is visible next to it. */
  labelled?: boolean;
}

/**
 * ClickUp-style status glyph. backlog = dotted ring · todo = ring · in progress = half pie ·
 * review = ¾ pie · blocked = filled with bar · complete = filled with check.
 */
export function StatusIndicator({ status, size = 14, labelled, className, ...props }: StatusIndicatorProps) {
  const pie = (fraction: number) => {
    const a = fraction * 2 * Math.PI - Math.PI / 2;
    const x = 8 + 4 * Math.cos(a), y = 8 + 4 * Math.sin(a);
    return `M8 8 L8 4 A4 4 0 ${fraction > 0.5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)} Z`;
  };
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      role={labelled ? "img" : undefined}
      aria-label={labelled ? TASK_STATUS_META[status].label : undefined}
      aria-hidden={labelled ? undefined : true}
      className={cn("shrink-0", SOLID_FILL[status], className)}
      {...props}
    >
      {status === "backlog" && <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeDasharray="2 2.2" />}
      {status === "todo" && <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.75" />}
      {status === "in-progress" && (<><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.75" /><path d={pie(0.5)} fill="currentColor" /></>)}
      {status === "review" && (<><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.75" /><path d={pie(0.75)} fill="currentColor" /></>)}
      {status === "blocked" && (<><circle cx="8" cy="8" r="7" fill="currentColor" /><path d="M5 8h6" stroke="hsl(var(--ag-bg-default))" strokeWidth="2" strokeLinecap="round" /></>)}
      {status === "complete" && (<><circle cx="8" cy="8" r="7" fill="currentColor" /><path d="m5 8.2 2 2 4-4.2" fill="none" stroke="hsl(var(--ag-bg-default))" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></>)}
    </svg>
  );
}

/* ================================================================== */
/* StatusBadge — ClickUp status pill                                   */
/* ================================================================== */
export function StatusBadge({ status, className, size = "md" }: { status: TaskStatus; className?: string; size?: "sm" | "md" }) {
  const c = TASK_STATUS_CLASS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm font-semibold uppercase tracking-wide",
        size === "sm" ? "h-[18px] px-1.5 text-2xs" : "h-[22px] px-2 text-[11px]",
        c.bg, c.text, className
      )}
    >
      <StatusIndicator status={status} size={size === "sm" ? 10 : 12} />
      {TASK_STATUS_META[status].label}
    </span>
  );
}

/* ================================================================== */
/* PriorityFlag                                                        */
/* ================================================================== */
export function PriorityFlag({ priority, showLabel = false, className }: { priority?: TaskPriority; showLabel?: boolean; className?: string }) {
  if (!priority) {
    return (
      <span className={cn("inline-flex items-center gap-1 whitespace-nowrap text-muted", className)}>
        <FlagOff aria-hidden className="size-dense-icon" />
        {showLabel ? <span>No priority</span> : <span className="sr-only">No priority</span>}
      </span>
    );
  }
  const m = TASK_PRIORITY_META[priority];
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap", m.text, className)}>
      <Flag aria-hidden className="size-dense-icon" fill="currentColor" fillOpacity={priority === "low" ? 0 : 0.9} />
      {showLabel ? <span className="text-default">{m.label}</span> : <span className="sr-only">{m.label} priority</span>}
    </span>
  );
}

/* ================================================================== */
/* Presence avatar + stack                                             */
/* ================================================================== */
const PRESENCE_DOT: Record<Presence, string> = { online: "bg-success-solid", away: "bg-attention-solid", busy: "bg-error-solid", offline: "bg-emphasis" };
const AVATAR_SIZE = { xs: "size-5 text-[9px]", sm: "size-6 text-2xs", md: "size-7 text-[11px]", lg: "size-8 text-xs" } as const;

export function MemberAvatar({ member, size = "sm", showPresence = true, className }: { member: WorkspaceMember; size?: keyof typeof AVATAR_SIZE; showPresence?: boolean; className?: string }) {
  const presence = showPresence ? member.presence : undefined;
  return (
    <span role="img" aria-label={presence ? `${member.name}, ${presence}` : member.name} title={member.name} className={cn("relative inline-flex shrink-0", className)}>
      {member.avatarUrl ? (
        <img src={member.avatarUrl} alt="" className={cn("rounded-full object-cover ring-2 ring-[hsl(var(--ag-bg-default))]", AVATAR_SIZE[size])} />
      ) : (
        <span aria-hidden className={cn("grid place-items-center rounded-full bg-brand font-semibold text-brand-fg ring-2 ring-[hsl(var(--ag-bg-default))]", AVATAR_SIZE[size])}>
          {member.initials ?? getInitials(member.name)}
        </span>
      )}
      {presence && <span aria-hidden className={cn("absolute -bottom-px -right-px size-2 rounded-full ring-2 ring-[hsl(var(--ag-bg-default))]", PRESENCE_DOT[presence])} />}
    </span>
  );
}

export function AssigneeStack({ members, max = 3, size = "sm", className }: { members: WorkspaceMember[]; max?: number; size?: keyof typeof AVATAR_SIZE; className?: string }) {
  if (!members.length) return null;
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;
  return (
    <span role="group" aria-label={`Assignees: ${members.map((m) => m.name).join(", ")}`} className={cn("inline-flex items-center -space-x-1.5", className)}>
      {shown.map((m) => <MemberAvatar key={m.id} member={m} size={size} />)}
      {extra > 0 && <span aria-hidden className={cn("grid place-items-center rounded-full bg-emphasis font-medium text-subtle ring-2 ring-[hsl(var(--ag-bg-default))]", AVATAR_SIZE[size])}>+{extra}</span>}
    </span>
  );
}

/* ================================================================== */
/* Inline pickers (cell editors)                                       */
/* ================================================================== */
const triggerBase =
  "inline-flex h-[calc(var(--ag-control-height)-4px)] max-w-full items-center gap-1.5 rounded-md px-1.5 text-dense text-default transition-colors hover:bg-subtle focus-ring data-[state=open]:bg-subtle";

export function OptionList<T extends string>({
  label, options, value, onSelect, render, multi = false,
}: {
  label: string;
  options: T[];
  value: T | T[] | undefined;
  onSelect: (v: T) => void;
  render: (v: T) => React.ReactNode;
  multi?: boolean;
}) {
  const refs = React.useRef<(HTMLLIElement | null)[]>([]);
  const selected = (v: T) => (Array.isArray(value) ? value.includes(v) : value === v);
  const onKey = (e: React.KeyboardEvent, i: number, v: T) => {
    if (e.key === "ArrowDown") { e.preventDefault(); refs.current[Math.min(i + 1, options.length - 1)]?.focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); refs.current[Math.max(i - 1, 0)]?.focus(); }
    if (e.key === "Home") { e.preventDefault(); refs.current[0]?.focus(); }
    if (e.key === "End") { e.preventDefault(); refs.current[options.length - 1]?.focus(); }
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(v); }
  };
  return (
    <ul role="listbox" aria-label={label} aria-multiselectable={multi || undefined} className="grid gap-0.5">
      {options.map((v, i) => (
        <li
          key={v}
          ref={(el) => { refs.current[i] = el; }}
          role="option"
          aria-selected={selected(v)}
          tabIndex={selected(v) || (i === 0 && !options.some(selected)) ? 0 : -1}
          onClick={() => onSelect(v)}
          onKeyDown={(e) => onKey(e, i, v)}
          className="flex h-8 cursor-default items-center gap-2 rounded-lg px-2 text-sm text-default outline-none hover:bg-subtle focus-visible:bg-subtle focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">{render(v)}</span>
          {selected(v) && <Check aria-hidden className="size-4 text-emphasis" />}
        </li>
      ))}
    </ul>
  );
}

export function TaskStatusPicker({ value, onChange, variant = "badge", statuses = TASK_STATUSES }: { value: TaskStatus; onChange: (s: TaskStatus) => void; variant?: "badge" | "icon"; statuses?: TaskStatus[] }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={cn(triggerBase, variant === "badge" && "px-0.5")} aria-label={`Status: ${TASK_STATUS_META[value].label}. Change status`}>
        {variant === "badge" ? <StatusBadge status={value} size="sm" /> : <StatusIndicator status={value} size={16} />}
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1" onOpenAutoFocus={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).querySelector<HTMLElement>('[tabindex="0"]')?.focus(); }}>
        <OptionList label="Status" options={statuses} value={value} onSelect={(s) => { onChange(s); setOpen(false); }} render={(s) => <><StatusIndicator status={s} />{TASK_STATUS_META[s].label}</>} />
      </PopoverContent>
    </Popover>
  );
}

export function TaskPriorityPicker({ value, onChange, showLabel = false }: { value?: TaskPriority; onChange: (p?: TaskPriority) => void; showLabel?: boolean }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={triggerBase} aria-label={`Priority: ${value ? TASK_PRIORITY_META[value].label : "none"}. Change priority`}>
        <PriorityFlag priority={value} showLabel={showLabel} />
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1" onOpenAutoFocus={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).querySelector<HTMLElement>('[tabindex="0"]')?.focus(); }}>
        <OptionList label="Priority" options={TASK_PRIORITIES} value={value} onSelect={(p) => { onChange(p); setOpen(false); }} render={(p) => <PriorityFlag priority={p} showLabel />} />
        {value && (
          <button type="button" onClick={() => { onChange(undefined); setOpen(false); }} className="mt-1 flex h-8 w-full items-center gap-2 rounded-lg px-2 text-sm text-subtle hover:bg-subtle focus-ring-inset">
            <X aria-hidden className="size-4" /> Clear
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function TaskAssigneePicker({ value, members, onChange, max = 3 }: { value: WorkspaceMember[]; members: WorkspaceMember[]; onChange: (m: WorkspaceMember[]) => void; max?: number }) {
  const [q, setQ] = React.useState("");
  const ids = value.map((m) => m.id);
  const list = members.filter((m) => m.name.toLowerCase().includes(q.toLowerCase()));
  const toggle = (id: string) => {
    const m = members.find((x) => x.id === id)!;
    onChange(ids.includes(id) ? value.filter((v) => v.id !== id) : [...value, m]);
  };
  return (
    <Popover onOpenChange={(o) => !o && setQ("")}>
      <PopoverTrigger className={cn(triggerBase, "px-1")} aria-label={value.length ? `Assignees: ${value.map((m) => m.name).join(", ")}. Change assignees` : "Add assignee"}>
        {value.length ? <AssigneeStack members={value} max={max} size="xs" /> : <UserPlus aria-hidden className="size-dense-icon text-muted" />}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2">
        <SearchInput size="md" aria-label="Search people" placeholder="Search people" value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ("")} autoFocus />
        <div className="mt-1.5">
          <OptionList
            label="Assignees"
            multi
            options={list.map((m) => m.id)}
            value={ids}
            onSelect={toggle}
            render={(id) => { const m = members.find((x) => x.id === id)!; return <><MemberAvatar member={m} size="xs" /><span className="truncate">{m.name}</span></>; }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function TaskDatePicker({ value, onChange, label = "Due date", done }: { value?: string; onChange: (d?: string) => void; label?: string; done?: boolean }) {
  const overdue = !done && isOverdue(value);
  const id = React.useId();
  return (
    <Popover>
      <PopoverTrigger className={cn(triggerBase, overdue && "text-error-on-surface")} aria-label={value ? `${label}: ${formatShortDate(value)}${overdue ? ", overdue" : ""}. Change` : `Set ${label.toLowerCase()}`}>
        {value ? <span className="tabular-nums">{formatShortDate(value)}</span> : <CalendarIcon aria-hidden className="size-dense-icon text-muted" />}
      </PopoverTrigger>
      <PopoverContent className="grid w-60 gap-2 p-3">
        <label htmlFor={id} className="text-sm font-medium text-emphasis">{label}</label>
        <input
          id={id}
          type="date"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || undefined)}
          className="h-8 rounded-control border border-control bg-default px-2 text-sm text-emphasis focus-ring-field"
        />
        <div className="flex gap-1.5">
          {[["Today", 0], ["Tomorrow", 1], ["Next week", 7]].map(([l, d]) => (
            <button key={l as string} type="button" onClick={() => { const t = new Date(); t.setDate(t.getDate() + (d as number)); onChange(t.toISOString().slice(0, 10)); }} className="rounded-md bg-subtle px-2 py-1 text-xs font-medium text-default hover:bg-emphasis focus-ring">
              {l as string}
            </button>
          ))}
          {value && <button type="button" onClick={() => onChange(undefined)} className="ml-auto rounded-md px-2 py-1 text-xs text-subtle hover:bg-subtle focus-ring">Clear</button>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
