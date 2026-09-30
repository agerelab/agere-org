"use client";

import * as React from "react";
import { ArrowUpDown, ChevronDown, Layers, ListFilter, Rows3, Rows4, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  TASK_PRIORITIES, TASK_PRIORITY_META, TASK_STATUSES, TASK_STATUS_META,
  type Density, type TaskPriority, type TaskStatus, type WorkspaceMember,
} from "@/lib/workspace";
import { SearchInput } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { MemberAvatar, OptionList, PriorityFlag, StatusIndicator } from "./task-fields";

export interface TaskFilters {
  status: TaskStatus[];
  priority: TaskPriority[];
  assignee: string[];
}
export const EMPTY_FILTERS: TaskFilters = { status: [], priority: [], assignee: [] };
export type GroupBy = "status" | "priority" | "assignee" | "none";
export type SortBy = "manual" | "due" | "priority" | "title";

export interface FilterBarProps {
  search: string;
  onSearchChange: (q: string) => void;
  filters: TaskFilters;
  onFiltersChange: (f: TaskFilters) => void;
  members: WorkspaceMember[];
  groupBy?: GroupBy;
  onGroupByChange?: (g: GroupBy) => void;
  sortBy?: SortBy;
  onSortByChange?: (s: SortBy) => void;
  density?: Density;
  onDensityChange?: (d: Density) => void;
  /** e.g. "24 tasks" — announced politely when it changes. */
  resultLabel?: string;
  className?: string;
}

const chip =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-control border px-2.5 text-dense font-medium transition-colors focus-ring data-[state=open]:bg-subtle";

function FilterChip<T extends string>({
  label, icon, options, value, onChange, render,
}: {
  label: string;
  icon: React.ReactNode;
  options: T[];
  value: T[];
  onChange: (v: T[]) => void;
  render: (v: T) => React.ReactNode;
}) {
  const on = value.length > 0;
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`${label} filter${on ? `, ${value.length} selected` : ""}`}
        className={cn(chip, on ? "border-brand/30 bg-brand/[0.06] text-emphasis" : "border-dashed border-default text-subtle hover:border-emphasis hover:text-emphasis")}
      >
        <span aria-hidden className="inline-flex [&_svg]:size-3.5">{icon}</span>
        {label}
        {on && <span className="rounded-sm bg-brand px-1 text-2xs leading-4 text-brand-fg tabular-nums">{value.length}</span>}
        <ChevronDown aria-hidden className="size-3" />
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" onOpenAutoFocus={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).querySelector<HTMLElement>('[tabindex="0"]')?.focus(); }}>
        <OptionList label={label} multi options={options} value={value} onSelect={(v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])} render={render} />
        {on && (
          <button type="button" onClick={() => onChange([])} className="mt-1 flex h-8 w-full items-center gap-2 rounded-lg px-2 text-sm text-subtle hover:bg-subtle focus-ring-inset">
            <X aria-hidden className="size-4" /> Clear {label.toLowerCase()}
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function MenuSelect<T extends string>({ label, icon, value, options, onChange }: { label: string; icon: React.ReactNode; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const [open, setOpen] = React.useState(false);
  const current = options.find((o) => o.value === value)?.label;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger aria-label={`${label}: ${current}`} className={cn(chip, "border-transparent text-subtle hover:bg-subtle hover:text-emphasis")}>
        <span aria-hidden className="inline-flex [&_svg]:size-3.5">{icon}</span>
        <span className="hidden md:inline">{label}:</span>
        <span className="text-emphasis">{current}</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-1" onOpenAutoFocus={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).querySelector<HTMLElement>('[tabindex="0"]')?.focus(); }}>
        <OptionList label={label} options={options.map((o) => o.value)} value={value} onSelect={(v) => { onChange(v); setOpen(false); }} render={(v) => options.find((o) => o.value === v)?.label} />
      </PopoverContent>
    </Popover>
  );
}

/**
 * ClickUp filter & grouping bar: search, Status / Assignee / Priority filters, Group by,
 * Sort by and the Comfortable/Compact density toggle. Pure controlled component.
 */
export function FilterBar({
  search, onSearchChange, filters, onFiltersChange, members, groupBy, onGroupByChange, sortBy, onSortByChange,
  density, onDensityChange, resultLabel, className,
}: FilterBarProps) {
  const active = filters.status.length + filters.priority.length + filters.assignee.length > 0 || search !== "";
  return (
    <div role="toolbar" aria-label="Filter and sort tasks" className={cn("flex flex-wrap items-center gap-2 border-b border-subtle bg-default px-3 py-2 sm:px-4", className)}>
      <div className="w-full sm:w-56">
        <SearchInput size="md" aria-label="Search tasks" placeholder="Search tasks" value={search} onChange={(e) => onSearchChange(e.target.value)} onClear={() => onSearchChange("")} />
      </div>
      <FilterChip label="Status" icon={<ListFilter />} options={TASK_STATUSES} value={filters.status} onChange={(status) => onFiltersChange({ ...filters, status })} render={(s) => <><StatusIndicator status={s} />{TASK_STATUS_META[s].label}</>} />
      <FilterChip
        label="Assignee"
        icon={<ListFilter />}
        options={members.map((m) => m.id)}
        value={filters.assignee}
        onChange={(assignee) => onFiltersChange({ ...filters, assignee })}
        render={(id) => { const m = members.find((x) => x.id === id)!; return <><MemberAvatar member={m} size="xs" />{m.name}</>; }}
      />
      <FilterChip label="Priority" icon={<ListFilter />} options={TASK_PRIORITIES} value={filters.priority} onChange={(priority) => onFiltersChange({ ...filters, priority })} render={(p) => <><PriorityFlag priority={p} />{TASK_PRIORITY_META[p].label}</>} />
      {active && (
        <button type="button" onClick={() => { onFiltersChange(EMPTY_FILTERS); onSearchChange(""); }} className="h-9 rounded-control px-2.5 text-dense font-medium text-subtle underline-offset-2 hover:text-emphasis hover:underline focus-ring">
          Clear all
        </button>
      )}
      {resultLabel && <span role="status" className="text-xs text-subtle tabular-nums">{resultLabel}</span>}
      <div className="ml-auto flex flex-wrap items-center gap-1">
        {groupBy && onGroupByChange && (
          <MenuSelect label="Group" icon={<Layers />} value={groupBy} onChange={onGroupByChange} options={[{ value: "status", label: "Status" }, { value: "priority", label: "Priority" }, { value: "assignee", label: "Assignee" }, { value: "none", label: "None" }]} />
        )}
        {sortBy && onSortByChange && (
          <MenuSelect label="Sort" icon={<ArrowUpDown />} value={sortBy} onChange={onSortByChange} options={[{ value: "manual", label: "Manual" }, { value: "due", label: "Due date" }, { value: "priority", label: "Priority" }, { value: "title", label: "Task name" }]} />
        )}
        {density && onDensityChange && (
          <SegmentedControl
            aria-label="Density"
            value={density}
            onValueChange={onDensityChange}
            options={[{ value: "comfortable", label: "Comfortable", icon: <Rows3 />, iconOnly: true }, { value: "compact", label: "Compact", icon: <Rows4 />, iconOnly: true }]}
          />
        )}
      </div>
    </div>
  );
}

/** Apply filters + search + sort to a task list (client-side helper). */
export function applyTaskQuery<T extends { title: string; status: TaskStatus; priority?: TaskPriority; assignees: { id: string }[]; dueDate?: string; key?: string }>(
  tasks: T[], q: string, f: TaskFilters, sort: SortBy = "manual"
): T[] {
  const t = q.trim().toLowerCase();
  const out = tasks.filter(
    (x) =>
      (!t || x.title.toLowerCase().includes(t) || x.key?.toLowerCase().includes(t)) &&
      (!f.status.length || f.status.includes(x.status)) &&
      (!f.priority.length || (x.priority && f.priority.includes(x.priority))) &&
      (!f.assignee.length || x.assignees.some((a) => f.assignee.includes(a.id)))
  );
  const rank = { urgent: 3, high: 2, normal: 1, low: 0 } as const;
  if (sort === "due") out.sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  if (sort === "priority") out.sort((a, b) => (b.priority ? rank[b.priority] : -1) - (a.priority ? rank[a.priority] : -1));
  if (sort === "title") out.sort((a, b) => a.title.localeCompare(b.title));
  return out;
}
