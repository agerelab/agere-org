"use client";

// Daftar (PRD-06 §6.10, list pattern): one group per status with a pill, count and collapse (done
// collapsed by default), column headers per group, 44 px rows, "+ Tambah tugas" per group, a checkbox
// per row (visible on hover or when selected) for the bulk bar, and "Ganti nama" in place (US-18).
import * as React from "react";
import { ChevronRight, Pencil, Plus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button, IconButton } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Locale, translator } from "@/i18n";
import type { BoardColumn, BoardTask } from "./board";
import { BulkBar } from "./bulk-bar";
import { DueTag, PriorityTag, StatusIcon } from "./task-bits";

type T = ReturnType<typeof translator>;
const PILL: Record<BoardColumn["category"], string> = {
  todo: "bg-task-status-todo-bg text-task-status-todo-fg",
  in_progress: "bg-task-status-in-progress-bg text-task-status-in-progress-fg",
  done: "bg-task-status-complete-bg text-task-status-complete-fg",
};
const GRID = "grid grid-cols-[minmax(0,1fr)_180px_140px_110px] items-center gap-3 max-md:grid-cols-[minmax(0,1fr)_110px]";

export function TaskListView({
  t,
  slug,
  locale,
  today,
  columns,
  tasks,
  assignees,
  readOnly,
  onOpen,
  onQuickAdd,
  onRename,
}: {
  t: T;
  slug: string;
  locale: Locale;
  today: string;
  columns: BoardColumn[];
  tasks: BoardTask[];
  assignees: { type: "user" | "team"; id: string; name: string }[];
  readOnly: boolean;
  onOpen: (id: string) => void;
  onQuickAdd: (columnId: string, title: string) => Promise<boolean>;
  onRename: (task: BoardTask, title: string) => Promise<boolean>;
}) {
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>(() => Object.fromEntries(columns.map((c) => [c.id, c.category === "done"])));
  const [adding, setAdding] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState("");
  const [renaming, setRenaming] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");
  const [selected, setSelected] = React.useState<string[]>([]);
  const [pending, start] = React.useTransition();
  const visible = new Set(tasks.map((x) => x.id));
  const chosen = selected.filter((id) => visible.has(id));

  const toggle = (id: string, on: boolean) => setSelected((s) => (on ? [...s, id] : s.filter((x) => x !== id)));

  const saveRename = (task: BoardTask) => {
    const next = draft.trim();
    if (!next || next === task.title) return setRenaming(null);
    start(async () => {
      if (await onRename(task, next)) setRenaming(null);
    });
  };

  return (
    <div className="grid gap-6 pb-16" data-density="compact">
      {columns.map((c) => {
        const rows = tasks.filter((x) => x.columnId === c.id);
        const closed = collapsed[c.id];
        const groupId = `group-${c.id}`;
        return (
          <section key={c.id} aria-labelledby={`${groupId}-title`}>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-expanded={!closed}
                aria-controls={groupId}
                onClick={() => setCollapsed((x) => ({ ...x, [c.id]: !closed }))}
                className="grid size-6 place-items-center rounded-sm text-subtle hover:bg-subtle focus-ring"
              >
                <ChevronRight aria-hidden className={cn("size-4 transition-transform", !closed && "rotate-90")} />
                <span className="sr-only">{c.name}</span>
              </button>
              <h3 id={`${groupId}-title`} className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium", PILL[c.category])}>
                <StatusIcon category={c.category} className="size-3.5 text-current" />
                {c.name}
              </h3>
              <span className="text-xs tabular-nums text-subtle">{rows.length}</span>
            </div>
            {!closed && (
              <div id={groupId} className="mt-2">
                {rows.length > 0 && (
                  <div aria-hidden className={cn(GRID, "border-b border-default px-3 pb-2 pl-[68px] text-xs font-medium text-subtle")}>
                    <span>{t("people.col.name")}</span>
                    <span className="max-md:hidden">{t("task.assignee")}</span>
                    <span>{t("task.due")}</span>
                    <span className="max-md:hidden">{t("task.priority")}</span>
                  </div>
                )}
                <ul>
                  {rows.map((task) => {
                    const isSelected = chosen.includes(task.id);
                    return (
                      <li key={task.id} className={cn("group/row border-b border-default", isSelected && "bg-subtle")}>
                        <div className={cn(GRID, "h-11 px-3 hover:bg-subtle")}>
                          <span className="flex min-w-0 items-center gap-3">
                            {!readOnly ? (
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(v) => toggle(task.id, v === true)}
                                aria-label={t("bulk.select", task.title)}
                                className={cn("shrink-0 opacity-0 focus-visible:opacity-100 group-hover/row:opacity-100", (isSelected || chosen.length > 0) && "opacity-100")}
                              />
                            ) : (
                              <span aria-hidden className="size-4 shrink-0" />
                            )}
                            <StatusIcon category={c.category} className="shrink-0" />
                            {renaming === task.id ? (
                              <Input
                                autoFocus
                                aria-label={t("list.renameLabel", task.title)}
                                value={draft}
                                maxLength={200}
                                className="h-8"
                                onChange={(e) => setDraft(e.target.value)}
                                onBlur={() => saveRename(task)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    saveRename(task);
                                  }
                                  if (e.key === "Escape") {
                                    e.preventDefault();
                                    setRenaming(null);
                                  }
                                }}
                                disabled={pending}
                              />
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => onOpen(task.id)}
                                  className={cn("min-w-0 truncate rounded-sm text-left text-sm text-emphasis hover:underline focus-ring", c.category === "done" && "text-subtle line-through")}
                                >
                                  {task.title}
                                </button>
                                {!readOnly && (
                                  <IconButton
                                    size="xs"
                                    variant="ghost"
                                    label={t("list.rename", task.title)}
                                    icon={<Pencil />}
                                    tooltip={false}
                                    className="shrink-0 opacity-0 focus-visible:opacity-100 group-hover/row:opacity-100"
                                    onClick={() => {
                                      setDraft(task.title);
                                      setRenaming(task.id);
                                    }}
                                  />
                                )}
                              </>
                            )}
                          </span>
                          <span className="flex min-w-0 items-center gap-1.5 text-sm text-subtle max-md:hidden">
                            {task.assignee ? (
                              <>
                                <Avatar name={task.assignee.name} size="xs" shape={task.assignee.type === "team" ? "square" : "circle"} />
                                <span className="truncate">{task.assignee.name}</span>
                              </>
                            ) : (
                              "—"
                            )}
                          </span>
                          <span>{task.dueDate ? <DueTag t={t} locale={locale} due={task.dueDate} today={today} done={c.category === "done"} /> : <span className="text-subtle">—</span>}</span>
                          <span className="max-md:hidden">{task.priority ? <PriorityTag t={t} priority={task.priority} /> : <span className="text-subtle">—</span>}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {!readOnly &&
                  (adding === c.id ? (
                    <form
                      className="flex items-center gap-2 px-3 py-2 pl-[68px]"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!title.trim()) return;
                        start(async () => {
                          if (await onQuickAdd(c.id, title)) setTitle("");
                        });
                      }}
                    >
                      <Input autoFocus aria-label={t("task.title")} value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setAdding(null)} />
                      <Button type="submit" size="sm" disabled={pending || !title.trim()}>{t("common.save")}</Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(null)}>{t("common.cancel")}</Button>
                    </form>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-[52px] mt-1 text-subtle"
                      onClick={() => {
                        setTitle("");
                        setAdding(c.id);
                      }}
                    >
                      <Plus aria-hidden />
                      {t("project.addTask")}
                    </Button>
                  ))}
              </div>
            )}
          </section>
        );
      })}
      {!readOnly && <BulkBar t={t} slug={slug} ids={chosen} assignees={assignees} onDone={() => setSelected([])} />}
    </div>
  );
}
