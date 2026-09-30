"use client";

import * as React from "react";
import { useDndContext, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ChevronLeft, ChevronRight, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { STATUS_DOT_CLASS } from "@/lib/agere-tokens";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useKanban } from "./kanban-context";
import { KanbanCard } from "./kanban-card";
import type { KanbanCardData, KanbanColumnData } from "./types";

export interface KanbanColumnProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  columnId: string;
  /** Render prop for each card. Defaults to <KanbanCard card={card} />. */
  children?: (card: KanbanCardData) => React.ReactNode;
  emptyLabel?: string;
}

export const KanbanColumn = React.forwardRef<HTMLElement, KanbanColumnProps>(
  ({ columnId, children, emptyLabel = "No cards yet", className, ...props }, ref) => {
    const { columns, matches, readOnly, onCardCreate, onColumnCollapse } = useKanban();
    const column = columns.find((c) => c.id === columnId);
    const { setNodeRef, isOver } = useDroppable({ id: columnId, disabled: readOnly });
    const { over } = useDndContext();

    if (!column) return null;
    const visible = column.cards.filter(matches);
    const isTarget = !!over && (over.id === column.id || column.cards.some((c) => c.id === over.id));

    if (column.collapsed) {
      return (
        <section ref={ref} aria-label={`${column.title}, collapsed`} className={cn("flex w-12 shrink-0 flex-col rounded-xl border bg-muted", className)} {...props}>
          <button
            type="button"
            ref={setNodeRef}
            onClick={() => onColumnCollapse?.(column.id, false)}
            aria-label={`Expand ${column.title}`}
            className="flex min-h-[180px] flex-col items-center gap-3 rounded-xl px-2 py-4 text-muted-foreground hover:text-foreground focus-ring"
          >
            <ChevronRight className="size-4" aria-hidden />
            <span className="text-xs font-medium [writing-mode:vertical-rl]">{column.title}</span>
            <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-2xs">{visible.length}</span>
          </button>
        </section>
      );
    }

    return (
      <section
        ref={ref}
        aria-label={`${column.title} column, ${visible.length} card${visible.length === 1 ? "" : "s"}`}
        data-drop-target={isTarget || undefined}
        className={cn(
          "flex max-h-full w-[300px] shrink-0 flex-col rounded-xl border bg-muted transition-[border-color,background-color] duration-fast",
          "data-[drop-target]:border-dashed data-[drop-target]:border-brand data-[drop-target]:bg-brand/[0.03]",
          className
        )}
        {...props}
      >
        <KanbanColumnHeader column={column} count={visible.length} />
        <SortableContext id={column.id} items={column.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {/* role="list" only when there are cards: an empty list role is an ARIA error (aria-required-children).
              The div stays either way — it is the drop zone. */}
          <div ref={setNodeRef} className="flex min-h-[180px] flex-1 flex-col gap-2 overflow-y-auto p-2" role={visible.length ? "list" : undefined}>
            {visible.map((card) => (
              <div role="listitem" key={card.id}>
                {children ? children(card) : <KanbanCard card={card} />}
              </div>
            ))}
            {!visible.length && (
              <div
                className={cn(
                  "flex min-h-24 items-center justify-center rounded-lg border border-dashed text-2xs text-muted-foreground",
                  isOver && "border-brand bg-brand/5 text-foreground"
                )}
              >
                {isOver ? "Drop card here" : emptyLabel}
              </div>
            )}
          </div>
        </SortableContext>
        {!readOnly && onCardCreate && (
          <Button variant="ghost" className="m-2 mt-0 justify-center" onClick={() => onCardCreate(column.id)}>
            <Plus aria-hidden /> Add card
          </Button>
        )}
      </section>
    );
  }
);
KanbanColumn.displayName = "KanbanColumn";

/* ------------------------------------------------------------------ */

interface KanbanColumnHeaderProps {
  column: KanbanColumnData;
  count: number;
}

function KanbanColumnHeader({ column, count }: KanbanColumnHeaderProps) {
  const { readOnly, onCardCreate, onColumnRename, onColumnDelete, onColumnCollapse } = useKanban();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(column.title);
  const overLimit = column.limit !== undefined && count > column.limit;

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== column.title) onColumnRename?.(column.id, next);
    else setDraft(column.title);
  };

  return (
    <header className="flex h-11 shrink-0 items-center gap-2 border-b px-3">
      <span aria-hidden className={cn("size-2 shrink-0 rounded-full", STATUS_DOT_CLASS[column.status ?? "blue"])} />
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(column.title);
              setEditing(false);
            }
          }}
          aria-label="Column name"
          className="h-7 min-w-0 flex-1 rounded-sm border border-ring bg-background px-1.5 text-xs font-semibold text-foreground outline-none"
        />
      ) : (
        <h2 className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground/80">{column.title}</h2>
      )}
      <span
        className={cn("rounded-full bg-foreground/10 px-1.5 py-0.5 text-2xs font-medium text-muted-foreground", overLimit && "bg-attention-bg text-attention-fg")}
        aria-label={overLimit ? `${count} cards, over limit of ${column.limit}` : `${count} cards`}
      >
        {column.limit !== undefined ? `${count}/${column.limit}` : count}
      </span>
      {!readOnly && (
        <>
          {onCardCreate && (
            <Button variant="ghost" size="icon-sm" onClick={() => onCardCreate(column.id)} aria-label={`Add card to ${column.title}`}>
              <Plus aria-hidden />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`${column.title} column actions`}>
                <MoreHorizontal aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onColumnRename && (
                <DropdownMenuItem onSelect={() => setEditing(true)}>
                  <Pencil aria-hidden /> Rename
                </DropdownMenuItem>
              )}
              {onColumnCollapse && (
                <DropdownMenuItem onSelect={() => onColumnCollapse(column.id, true)}>
                  <ChevronLeft aria-hidden /> Collapse column
                </DropdownMenuItem>
              )}
              {onColumnDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem destructive onSelect={() => onColumnDelete(column.id)}>
                    <Trash2 aria-hidden /> Delete column
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </header>
  );
}
