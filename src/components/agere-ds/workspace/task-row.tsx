"use client";

import * as React from "react";
import { ChevronRight, CornerDownRight, MessageSquare, MoreHorizontal, Paperclip, Pencil, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  TASK_PRIORITY_META, TASK_STATUS_META, TASK_STATUSES, formatDuration,
  type CustomFieldDef, type TaskPriority, type WorkspaceMember, type WorkspaceTask,
} from "@/lib/workspace";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  OptionList, StatusBadge, TaskAssigneePicker, TaskDatePicker, TaskPriorityPicker, TaskStatusPicker,
} from "./task-fields";
import type { GroupBy } from "./filter-bar";

/* ================================================================== */
/* Column model                                                        */
/* ================================================================== */
export interface TaskListColumns {
  assignee?: boolean;
  due?: boolean;
  priority?: boolean;
  time?: boolean;
  custom?: CustomFieldDef[];
}
const DEFAULT_COLUMNS: Required<Omit<TaskListColumns, "custom">> = { assignee: true, due: true, priority: true, time: false };

function gridTemplate(c: TaskListColumns) {
  const cols = ["minmax(320px,1fr)"];
  if (c.assignee) cols.push("112px");
  if (c.due) cols.push("104px");
  if (c.priority) cols.push("96px");
  if (c.time) cols.push("96px");
  (c.custom ?? []).forEach(() => cols.push("128px"));
  cols.push("40px");
  return cols.join(" ");
}

/* ================================================================== */
/* Inline title editor                                                 */
/* ================================================================== */
function InlineTitle({ task, onRename, onOpen }: { task: WorkspaceTask; onRename: (title: string) => void; onOpen?: () => void }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(task.title);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const done = TASK_STATUS_META[task.status].done;

  const commit = (save: boolean) => {
    const v = draft.trim();
    if (save && v && v !== task.title) onRename(v);
    else setDraft(task.title);
    setEditing(false);
    requestAnimationFrame(() => btnRef.current?.focus());
  };

  if (editing) {
    return (
      <input
        autoFocus
        aria-label="Task name"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(true); }
          if (e.key === "Escape") { e.preventDefault(); commit(false); }
        }}
        className="h-[calc(var(--ag-control-height)-2px)] min-w-0 flex-1 rounded-md border border-control bg-default px-2 text-dense text-emphasis focus-ring-field"
      />
    );
  }
  return (
    <span className="group/title flex min-w-[140px] flex-1 items-center gap-1.5">
      <button
        ref={btnRef}
        type="button"
        onClick={onOpen}
        onKeyDown={(e) => { if (e.key === "F2") { e.preventDefault(); setDraft(task.title); setEditing(true); } }}
        onDoubleClick={() => { setDraft(task.title); setEditing(true); }}
        aria-keyshortcuts="F2"
        className={cn("min-w-0 truncate rounded-sm text-left text-dense font-medium text-emphasis hover:underline focus-ring", done && "text-subtle line-through decoration-1")}
      >
        {task.title}
      </button>
      <button
        type="button"
        aria-label={`Rename ${task.title}`}
        onClick={() => { setDraft(task.title); setEditing(true); }}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-subtle opacity-0 transition-opacity hover:bg-emphasis hover:text-emphasis focus-ring group-hover/row:opacity-100 focus-visible:opacity-100"
      >
        <Pencil aria-hidden className="size-3.5" />
      </button>
    </span>
  );
}

/* ================================================================== */
/* Custom field cell                                                   */
/* ================================================================== */
function CustomFieldCell({ def, value, onChange }: { def: CustomFieldDef; value: string | number | undefined; onChange: (v: string | number | undefined) => void }) {
  const [editing, setEditing] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const display =
    value === undefined || value === ""
      ? null
      : def.kind === "currency"
        ? new Intl.NumberFormat("id-ID", { style: "currency", currency: def.currency ?? "IDR", maximumFractionDigits: 0 }).format(Number(value))
        : def.kind === "select"
          ? def.options?.find((o) => o.value === value)?.label
          : String(value);

  if (def.kind === "select") {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger aria-label={`${def.label}: ${display ?? "empty"}. Change`} className="flex h-[calc(var(--ag-control-height)-4px)] w-full items-center rounded-md px-1.5 text-left text-dense text-default hover:bg-subtle focus-ring">
          {display ? <Badge size="sm" variant="gray">{display}</Badge> : <span className="text-muted">—</span>}
        </PopoverTrigger>
        <PopoverContent className="w-44 p-1" onOpenAutoFocus={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).querySelector<HTMLElement>('[tabindex="0"]')?.focus(); }}>
          <OptionList label={def.label} options={(def.options ?? []).map((o) => o.value)} value={value as string} onSelect={(v) => { onChange(v); setOpen(false); }} render={(v) => def.options?.find((o) => o.value === v)?.label} />
        </PopoverContent>
      </Popover>
    );
  }
  if (editing) {
    return (
      <input
        autoFocus
        aria-label={def.label}
        type={def.kind === "text" ? "text" : "number"}
        defaultValue={value ?? ""}
        onBlur={(e) => { onChange(e.target.value === "" ? undefined : def.kind === "text" ? e.target.value : Number(e.target.value)); setEditing(false); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setEditing(false);
        }}
        className={cn("h-[calc(var(--ag-control-height)-4px)] w-full rounded-md border border-control bg-default px-1.5 text-dense text-emphasis focus-ring-field", def.kind !== "text" && "text-right tabular-nums")}
      />
    );
  }
  return (
    <button
      type="button"
      aria-label={`${def.label}: ${display ?? "empty"}. Edit`}
      onClick={() => setEditing(true)}
      className={cn("flex h-[calc(var(--ag-control-height)-4px)] w-full items-center rounded-md px-1.5 text-dense text-default hover:bg-subtle focus-ring", def.kind !== "text" && "justify-end tabular-nums")}
    >
      {display ?? <span className="text-muted">—</span>}
    </button>
  );
}

/* ================================================================== */
/* TaskRow                                                             */
/* ================================================================== */
export interface TaskRowProps {
  task: WorkspaceTask;
  members: WorkspaceMember[];
  columns?: TaskListColumns;
  onChange: (id: string, patch: Partial<WorkspaceTask>) => void;
  onOpen?: (id: string) => void;
  selected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  /** Row actions menu content (DropdownMenu) or any trailing node. */
  actions?: React.ReactNode;
  /** Indent level for subtasks. */
  depth?: number;
  style?: React.CSSProperties;
}

/**
 * Data-dense task row (ClickUp List view). Every cell is an inline editor:
 * status, name (F2 / double-click / pencil), assignees, due date, priority and custom fields.
 * Height and padding follow the density tokens (h-row, px-cell-x, text-dense).
 */
export function TaskRow({ task, members, columns = DEFAULT_COLUMNS, onChange, onOpen, selected, onSelectedChange, actions, depth = 0, style }: TaskRowProps) {
  const c = { ...DEFAULT_COLUMNS, ...columns };
  const patch = (p: Partial<WorkspaceTask>) => onChange(task.id, p);
  const cell = "flex min-w-0 items-center px-cell-x";
  return (
    <div
      role="row"
      aria-selected={onSelectedChange ? !!selected : undefined}
      data-state={selected ? "selected" : undefined}
      style={{ gridTemplateColumns: gridTemplate(c), ...style }}
      className="group/row grid h-row items-center border-b border-subtle bg-default text-dense transition-colors hover:bg-muted data-[state=selected]:bg-brand/[0.05]"
    >
      <div role="cell" className={cn(cell, "gap-2")} style={{ paddingLeft: `calc(var(--ag-cell-x) + ${depth * 20}px)` }}>
        {onSelectedChange && (
          <Checkbox aria-label={`Select ${task.title}`} checked={!!selected} onCheckedChange={(v) => onSelectedChange(!!v)} className={cn("opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100", selected && "opacity-100")} />
        )}
        {depth > 0 && <CornerDownRight aria-hidden className="size-3.5 shrink-0 text-muted" />}
        <TaskStatusPicker value={task.status} onChange={(status) => patch({ status })} variant="icon" />
        <InlineTitle task={task} onRename={(title) => patch({ title })} onOpen={onOpen ? () => onOpen(task.id) : undefined} />
        <span className="flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap text-xs text-subtle [flex-shrink:10] [&>*]:shrink-0">
          {task.key && <span className="hidden font-mono text-2xs text-muted lg:inline">{task.key}</span>}
          {task.tags?.slice(0, 2).map((t) => <Badge key={t.id} size="sm" variant={t.tone ?? "gray"} className="hidden xl:inline-flex">{t.label}</Badge>)}
          {task.subtasks && task.subtasks.total > 0 && (
            <span className="inline-flex items-center gap-0.5 tabular-nums" aria-label={`${task.subtasks.done} of ${task.subtasks.total} subtasks done`}>
              <CornerDownRight aria-hidden className="size-3" />{task.subtasks.done}/{task.subtasks.total}
            </span>
          )}
          {!!task.comments && <span className="hidden items-center gap-0.5 sm:inline-flex" aria-label={`${task.comments} comments`}><MessageSquare aria-hidden className="size-3" />{task.comments}</span>}
          {!!task.attachments && <span className="hidden items-center gap-0.5 sm:inline-flex" aria-label={`${task.attachments} attachments`}><Paperclip aria-hidden className="size-3" />{task.attachments}</span>}
        </span>
      </div>
      {c.assignee && <div role="cell" className={cell}><TaskAssigneePicker value={task.assignees} members={members} onChange={(assignees) => patch({ assignees })} /></div>}
      {c.due && <div role="cell" className={cell}><TaskDatePicker value={task.dueDate} onChange={(dueDate) => patch({ dueDate })} done={TASK_STATUS_META[task.status].done} /></div>}
      {c.priority && <div role="cell" className={cell}><TaskPriorityPicker value={task.priority} onChange={(priority) => patch({ priority })} showLabel={!!task.priority} /></div>}
      {c.time && (
        <div role="cell" className={cn(cell, "justify-end whitespace-nowrap tabular-nums text-subtle")}>
          {task.timeTracked ? formatDuration(task.timeTracked) : "—"}
          {task.timeEstimate ? <span className="text-muted">&nbsp;/ {formatDuration(task.timeEstimate)}</span> : null}
        </div>
      )}
      {(c.custom ?? []).map((def) => (
        <div role="cell" key={def.id} className={cn(cell, "px-1")}>
          <CustomFieldCell def={def} value={task.custom?.[def.id]} onChange={(v) => patch({ custom: { ...task.custom, [def.id]: v } })} />
        </div>
      ))}
      <div role="cell" className="flex items-center justify-center">
        {actions ?? (
          <button type="button" aria-label={`More actions for ${task.title}`} className="inline-flex size-6 items-center justify-center rounded-md text-subtle opacity-0 hover:bg-emphasis group-hover/row:opacity-100 focus-visible:opacity-100 focus-ring">
            <MoreHorizontal aria-hidden className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/* TaskList — grouped, collapsible, with header                        */
/* ================================================================== */
export interface TaskListProps {
  tasks: WorkspaceTask[];
  members: WorkspaceMember[];
  groupBy?: GroupBy;
  columns?: TaskListColumns;
  onTaskChange: (id: string, patch: Partial<WorkspaceTask>) => void;
  onTaskOpen?: (id: string) => void;
  onAddTask?: (group: { by: GroupBy; key: string }) => void;
  label?: string;
  className?: string;
}

interface Group { key: string; label: React.ReactNode; name: string; tasks: WorkspaceTask[] }

function groupTasks(tasks: WorkspaceTask[], by: GroupBy, members: WorkspaceMember[]): Group[] {
  if (by === "none") return [{ key: "all", name: "All tasks", label: "All tasks", tasks }];
  if (by === "status") return TASK_STATUSES.map((s) => ({ key: s, name: TASK_STATUS_META[s].label, label: <StatusBadge status={s} size="sm" />, tasks: tasks.filter((t) => t.status === s) })).filter((g) => g.tasks.length);
  if (by === "priority") {
    const keys: (TaskPriority | "none")[] = ["urgent", "high", "normal", "low", "none"];
    return keys.map((k) => ({ key: k, name: k === "none" ? "No priority" : TASK_PRIORITY_META[k].label, label: k === "none" ? "No priority" : TASK_PRIORITY_META[k].label, tasks: tasks.filter((t) => (t.priority ?? "none") === k) })).filter((g) => g.tasks.length);
  }
  const groups: Group[] = members.map((m) => ({ key: m.id, name: m.name, label: m.name, tasks: tasks.filter((t) => t.assignees.some((a) => a.id === m.id)) }));
  groups.push({ key: "unassigned", name: "Unassigned", label: "Unassigned", tasks: tasks.filter((t) => !t.assignees.length) });
  return groups.filter((g) => g.tasks.length);
}

export function TaskList({ tasks, members, groupBy = "status", columns = DEFAULT_COLUMNS, onTaskChange, onTaskOpen, onAddTask, label = "Tasks", className }: TaskListProps) {
  const c = { ...DEFAULT_COLUMNS, ...columns };
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const groups = groupTasks(tasks, groupBy, members);
  const minWidth = 320 + (c.assignee ? 112 : 0) + (c.due ? 104 : 0) + (c.priority ? 96 : 0) + (c.time ? 96 : 0) + (c.custom?.length ?? 0) * 128 + 40;
  const header = "flex items-center px-cell-x text-2xs font-medium uppercase tracking-wide text-subtle";

  return (
    <div className={cn("min-h-0 overflow-auto", className)}>
      <div role="table" aria-label={label} aria-rowcount={tasks.length} style={{ minWidth }} className="text-dense">
        <div role="rowgroup" className="sticky top-0 z-sticky">
          <div role="row" style={{ gridTemplateColumns: gridTemplate(c) }} className="grid h-8 border-b border-subtle bg-muted">
            <div role="columnheader" className={header}>Name</div>
            {c.assignee && <div role="columnheader" className={header}>Assignee</div>}
            {c.due && <div role="columnheader" className={header}>Due date</div>}
            {c.priority && <div role="columnheader" className={header}>Priority</div>}
            {c.time && <div role="columnheader" className={cn(header, "justify-end")}>Time</div>}
            {(c.custom ?? []).map((d) => <div role="columnheader" key={d.id} className={cn(header, d.kind !== "text" && d.kind !== "select" && "justify-end")}>{d.label}</div>)}
            <div role="columnheader"><span className="sr-only">Actions</span></div>
          </div>
        </div>
        {groups.map((g) => {
          const isCollapsed = collapsed.has(g.key);
          return (
            <div role="rowgroup" key={g.key} aria-label={`${g.name}, ${g.tasks.length} tasks`}>
              <div role="row" className="flex h-10 items-center gap-2 border-b border-subtle bg-default px-cell-x">
                <div role="cell" className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-expanded={!isCollapsed}
                    aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${g.name}`}
                    onClick={() => setCollapsed((s) => { const n = new Set(s); n.has(g.key) ? n.delete(g.key) : n.add(g.key); return n; })}
                    className="inline-flex size-6 items-center justify-center rounded-md text-subtle hover:bg-subtle focus-ring"
                  >
                    <ChevronRight aria-hidden className={cn("size-4 transition-transform duration-base", !isCollapsed && "rotate-90")} />
                  </button>
                  <span className="text-sm font-semibold text-emphasis">{g.label}</span>
                  <span className="text-xs text-subtle tabular-nums">{g.tasks.length}</span>
                  {onAddTask && (
                    <button type="button" onClick={() => onAddTask({ by: groupBy, key: g.key })} className="ml-1 inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-xs font-medium text-subtle hover:bg-subtle hover:text-emphasis focus-ring">
                      <Plus aria-hidden className="size-3.5" /> Add task
                    </button>
                  )}
                </div>
              </div>
              {!isCollapsed &&
                g.tasks.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    members={members}
                    columns={c}
                    onChange={onTaskChange}
                    onOpen={onTaskOpen}
                    selected={selected.has(t.id)}
                    onSelectedChange={(v) => setSelected((s) => { const n = new Set(s); v ? n.add(t.id) : n.delete(t.id); return n; })}
                  />
                ))}
            </div>
          );
        })}
      </div>
      <p role="status" className="sr-only">{selected.size ? `${selected.size} selected` : ""}</p>
    </div>
  );
}
