"use client";

// Papan (PRD-06 §6.7, §8): columns of cards, drag and drop (@dnd-kit, as in Agere DS) with a keyboard
// equivalent on every card — Space or the ⋯ button opens "Pindahkan ke…" (US-4). Every label and
// screen-reader announcement comes from the catalog (D45).
import * as React from "react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MoreHorizontal, Plus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { ColumnCategory, Priority } from "@/db/schema";
import type { Locale, translator } from "@/i18n";
import { DueTag, PriorityTag, StatusIcon } from "./task-bits";

type T = ReturnType<typeof translator>;
export type BoardColumn = { id: string; name: string; category: ColumnCategory };
export type BoardTask = {
  id: string;
  columnId: string;
  title: string;
  assignee: { type: "user" | "team"; id: string; name: string } | null;
  dueDate: string | null;
  priority: Priority | null;
  version: number;
  done: boolean;
};
export type Move = { taskId: string; columnId: string; index: number };

type Props = {
  t: T;
  locale: Locale;
  today: string;
  columns: BoardColumn[];
  tasks: BoardTask[];
  readOnly: boolean;
  onMove: (m: Move) => void;
  onOpen: (taskId: string) => void;
  onAdd: (columnId: string) => void;
  onColumnMenu?: (column: BoardColumn) => React.ReactNode;
  trailing?: React.ReactNode;
};

const byColumn = (columns: BoardColumn[], tasks: BoardTask[]) => Object.fromEntries(columns.map((c) => [c.id, tasks.filter((t) => t.columnId === c.id).map((t) => t.id)]));

export function Board({ t, locale, today, columns, tasks, readOnly, onMove, onOpen, onAdd, onColumnMenu, trailing }: Props) {
  const [draft, setDraft] = React.useState<Record<string, string[]> | null>(null);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [live, setLive] = React.useState("");
  const items = draft ?? byColumn(columns, tasks);
  const taskOf = (id: string) => tasks.find((x) => x.id === id);
  const columnOfItem = (id: string) => (items[id] ? id : Object.keys(items).find((c) => items[c].includes(id)));
  const nameOf = (id: string) => columns.find((c) => c.id === id)?.name ?? "";
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const announcements: Announcements = {
    onDragStart: ({ active }) => t("board.sr.picked", taskOf(String(active.id))?.title ?? ""),
    onDragOver: ({ active, over }) => (over ? t("board.sr.over", taskOf(String(active.id))?.title ?? "", nameOf(columnOfItem(String(over.id)) ?? "")) : ""),
    onDragEnd: ({ active, over }) => (over ? t("board.sr.dropped", taskOf(String(active.id))?.title ?? "", nameOf(columnOfItem(String(over.id)) ?? "")) : ""),
    onDragCancel: ({ active }) => t("board.sr.cancelled", taskOf(String(active.id))?.title ?? ""),
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
    setDraft(byColumn(columns, tasks));
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || !draft) return;
    const from = columnOfItem(String(active.id));
    const to = columnOfItem(String(over.id));
    if (!from || !to || from === to) return;
    setDraft((d) => {
      if (!d) return d;
      const target = d[to].filter((x) => x !== active.id);
      const at = d[to].indexOf(String(over.id));
      target.splice(at < 0 ? target.length : at, 0, String(active.id));
      return { ...d, [from]: d[from].filter((x) => x !== active.id), [to]: target };
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const id = String(active.id);
    const d = draft;
    setActiveId(null);
    setDraft(null);
    if (!over || !d) return;
    const col = columnOfItem(String(over.id));
    if (!col) return;
    // Cross-column moves were placed by onDragOver; within a column, reorder to the card under the pointer.
    const overIndex = String(over.id) === col ? d[col].length - 1 : d[col].indexOf(String(over.id));
    const list = overIndex >= 0 ? arrayMove(d[col], d[col].indexOf(id), overIndex) : d[col];
    const index = list.indexOf(id);
    const before = byColumn(columns, tasks)[col] ?? [];
    if (taskOf(id)?.columnId === col && before.indexOf(id) === index) return;
    onMove({ taskId: id, columnId: col, index });
  };

  /** Keyboard / menu move: to the end of a column, announced (US-4). */
  const moveTo = (task: BoardTask, column: BoardColumn) => {
    const index = (items[column.id] ?? []).filter((x) => x !== task.id).length;
    onMove({ taskId: task.id, columnId: column.id, index });
    setLive(t("board.sr.moved", task.title, column.name, String(index + 1)));
  };

  const active = activeId ? taskOf(activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setDraft(null);
      }}
      accessibility={{ announcements, screenReaderInstructions: { draggable: t("board.sr.instructions") } }}
    >
      <div className="flex min-h-0 flex-1 items-start gap-3 overflow-x-auto pb-4">
        {columns.map((column) => (
          <Column
            key={column.id}
            t={t}
            locale={locale}
            today={today}
            column={column}
            ids={items[column.id] ?? []}
            taskOf={taskOf}
            columns={columns}
            readOnly={readOnly}
            onOpen={onOpen}
            onAdd={onAdd}
            moveTo={moveTo}
            menu={onColumnMenu?.(column)}
          />
        ))}
        {trailing}
      </div>
      <DragOverlay>{active ? <CardBody t={t} locale={locale} today={today} task={active} category={columns.find((c) => c.id === active.columnId)?.category ?? "todo"} lifted /> : null}</DragOverlay>
      <p aria-live="polite" className="sr-only">{live}</p>
    </DndContext>
  );
}

type ColumnProps = {
  t: T;
  locale: Locale;
  today: string;
  column: BoardColumn;
  ids: string[];
  taskOf: (id: string) => BoardTask | undefined;
  columns: BoardColumn[];
  readOnly: boolean;
  onOpen: (id: string) => void;
  onAdd: (columnId: string) => void;
  moveTo: (task: BoardTask, column: BoardColumn) => void;
  menu?: React.ReactNode;
};

function Column({ t, locale, today, column, ids, taskOf, columns, readOnly, onOpen, onAdd, moveTo, menu }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, disabled: readOnly });
  return (
    <section aria-label={column.name} className={cn("flex w-72 shrink-0 flex-col rounded-xl bg-muted", isOver && "ring-2 ring-border-strong")}>
      <header className="flex items-center gap-2 px-3 py-2.5">
        <StatusIcon category={column.category} />
        <h3 className="truncate text-sm font-semibold text-emphasis">{column.name}</h3>
        <span className="rounded-full bg-subtle px-1.5 text-xs tabular-nums text-subtle">{ids.length}</span>
        <span className="ml-auto flex items-center">
          {!readOnly && <IconButton size="xs" label={t("board.addIn", column.name)} icon={<Plus />} onClick={() => onAdd(column.id)} tooltip={false} />}
          {menu}
        </span>
      </header>
      <SortableContext id={column.id} items={ids} strategy={verticalListSortingStrategy}>
        <ol ref={setNodeRef} className="flex min-h-16 flex-col gap-2 px-2 pb-2">
          {ids.length === 0 && <li className="rounded-lg border border-dashed border-default px-3 py-4 text-center text-xs text-subtle">{t("project.noTasks")}</li>}
          {ids.map((id) => {
            const task = taskOf(id);
            return task ? (
              <SortableCard key={id} t={t} locale={locale} today={today} task={task} category={column.category} columns={columns} readOnly={readOnly} onOpen={onOpen} moveTo={moveTo} />
            ) : null;
          })}
        </ol>
      </SortableContext>
    </section>
  );
}

type CardProps = { t: T; locale: Locale; today: string; task: BoardTask; category: ColumnCategory; columns: BoardColumn[]; readOnly: boolean; onOpen: (id: string) => void; moveTo: (task: BoardTask, column: BoardColumn) => void };

function SortableCard({ t, locale, today, task, category, columns, readOnly, onOpen, moveTo }: CardProps) {
  // Pointer drag only: the keyboard path is the "Pindahkan ke…" menu, so the list item stays a plain
  // item (dnd-kit's attributes would make it a second, nested button).
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({ id: task.id, disabled: readOnly });
  const [menuOpen, setMenuOpen] = React.useState(false);
  const described = [task.assignee?.name, task.dueDate].filter(Boolean).join(", ");
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("group/card relative", isDragging && "opacity-40")} {...(readOnly ? {} : listeners)}>
      <button
        type="button"
        onClick={() => onOpen(task.id)}
        onKeyDown={(e) => {
          if (e.key === " " && !readOnly) {
            e.preventDefault();
            setMenuOpen(true);
          }
        }}
        aria-label={described ? `${task.title}, ${described}` : task.title}
        aria-roledescription={t("board.sr.card")}
        className="block w-full rounded-lg text-left focus-ring"
      >
        <CardBody t={t} locale={locale} today={today} task={task} category={category} />
      </button>
      {!readOnly && (
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <IconButton size="xs" label={t("board.moveTo", task.title)} icon={<MoreHorizontal />} tooltip={false} className="absolute right-1.5 top-1.5 opacity-0 focus-visible:opacity-100 group-hover/card:opacity-100 data-[state=open]:opacity-100" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("board.moveToLabel")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {columns.map((c) => (
              <DropdownMenuItem key={c.id} disabled={c.id === task.columnId} onSelect={() => moveTo(task, c)}>
                <StatusIcon category={c.category} />
                {c.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}

function CardBody({ t, locale, today, task, category, lifted }: { t: T; locale: Locale; today: string; task: BoardTask; category: ColumnCategory; lifted?: boolean }) {
  return (
    <div className={cn("grid gap-2 rounded-lg border border-default bg-card p-3 shadow-elevation-1 hover:border-border-strong", lifted && "shadow-elevation-4")}>
      <span className="flex items-start gap-2 pr-6">
        <StatusIcon category={category} className="mt-0.5 shrink-0" />
        <span className={cn("line-clamp-2 text-sm font-medium text-emphasis", category === "done" && "text-subtle line-through")}>{task.title}</span>
      </span>
      {(task.assignee || task.dueDate || task.priority) && (
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-default pt-2">
          {task.assignee && (
            <span className="flex min-w-0 items-center gap-1.5 text-xs text-subtle">
              <Avatar name={task.assignee.name} size="xs" shape={task.assignee.type === "team" ? "square" : "circle"} />
              <span className="truncate">{task.assignee.name}</span>
            </span>
          )}
          <DueTag t={t} locale={locale} due={task.dueDate} today={today} done={category === "done"} />
          <PriorityTag t={t} priority={task.priority} />
        </span>
      )}
    </div>
  );
}
