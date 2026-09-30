"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import { cn } from "@/lib/utils";
import { KanbanCardContent } from "./kanban-card";
import { KanbanContext, type KanbanContextValue } from "./kanban-context";
import type { KanbanCardData, KanbanColumnData, KanbanMove } from "./types";

export interface KanbanProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  columns: KanbanColumnData[];
  readOnly?: boolean;
  /** Controlled search query; omit to let <KanbanToolbar> own it. */
  query?: string;
  onQueryChange?: (query: string) => void;
  onCardMove?: (move: KanbanMove) => void;
  onCardClick?: (cardId: string) => void;
  onCardCreate?: (columnId: string) => void;
  onColumnRename?: (columnId: string, title: string) => void;
  onColumnDelete?: (columnId: string) => void;
  onColumnCollapse?: (columnId: string, collapsed: boolean) => void;
  /** Drag preview. Defaults to a lifted copy of the card. */
  renderOverlay?: (card: KanbanCardData) => React.ReactNode;
  children: React.ReactNode;
}

type Located = { columnIndex: number; cardIndex: number };

function locate(columns: KanbanColumnData[], id: string): Located | null {
  for (let c = 0; c < columns.length; c++) {
    if (columns[c].id === id) return { columnIndex: c, cardIndex: -1 };
    const i = columns[c].cards.findIndex((card) => card.id === id);
    if (i >= 0) return { columnIndex: c, cardIndex: i };
  }
  return null;
}

/**
 * <Kanban> owns drag state only. Persistence stays with the caller:
 * the board shows a live preview while dragging and emits one
 * `onCardMove` on drop; the caller updates `columns` (optimistically or not).
 */
export const Kanban = React.forwardRef<HTMLElement, KanbanProps>(
  (
    {
      columns,
      readOnly = false,
      query: queryProp,
      onQueryChange,
      onCardMove,
      onCardClick,
      onCardCreate,
      onColumnRename,
      onColumnDelete,
      onColumnCollapse,
      renderOverlay,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [innerQuery, setInnerQuery] = React.useState("");
    const query = queryProp ?? innerQuery;
    const setQuery = React.useCallback(
      (q: string) => {
        if (queryProp === undefined) setInnerQuery(q);
        onQueryChange?.(q);
      },
      [queryProp, onQueryChange]
    );

    // Draft mirrors `columns` while a drag is in flight (cross-column preview).
    const [draft, setDraft] = React.useState<KanbanColumnData[] | null>(null);
    const [active, setActive] = React.useState<{ card: KanbanCardData; from: Located & { columnId: string } } | null>(null);
    const view = draft ?? columns;

    // Latest board (draft while dragging) for the keyboard coordinate getter.
    const viewRef = React.useRef(view);
    viewRef.current = view;

    /**
     * ↑/↓ reorder inside a column (dnd-kit sortable default).
     * ←/→ jump to the neighbouring column. Done by column index rather than
     * by comparing rect.left, which fails on sub-pixel equal card positions.
     */
    const coordinateGetter = React.useCallback<KeyboardCoordinateGetter>((event, args) => {
      if (event.code !== "ArrowLeft" && event.code !== "ArrowRight") return sortableKeyboardCoordinates(event, args);
      event.preventDefault();
      const { active, droppableRects } = args.context;
      if (!active) return undefined;
      const cols = viewRef.current;
      const from = cols.findIndex((c) => c.cards.some((card) => card.id === active.id));
      const to = from + (event.code === "ArrowRight" ? 1 : -1);
      const target = cols[to];
      if (from < 0 || !target) return undefined;
      const anchorId = target.collapsed || !target.cards.length ? target.id : target.cards[0].id;
      const rect = droppableRects.get(anchorId) ?? droppableRects.get(target.id);
      return rect ? { x: rect.left + 4, y: rect.top + 4 } : undefined;
    }, []);

    const sensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
      useSensor(KeyboardSensor, { coordinateGetter })
    );

    const normalized = query.trim().toLowerCase();
    const matches = React.useCallback(
      (card: KanbanCardData) =>
        !normalized ||
        [card.title, card.description, card.assignee?.name, ...(card.tags?.map((t) => t.label) ?? [])]
          .filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(normalized)),
      [normalized]
    );

    const handleDragStart = ({ active: a }: DragStartEvent) => {
      const loc = locate(columns, String(a.id));
      if (!loc || loc.cardIndex < 0) return;
      setActive({ card: columns[loc.columnIndex].cards[loc.cardIndex], from: { ...loc, columnId: columns[loc.columnIndex].id } });
      setDraft(columns.map((c) => ({ ...c, cards: [...c.cards] })));
    };

    const handleDragOver = ({ active: a, over }: DragOverEvent) => {
      if (!over || !draft) return;
      const from = locate(draft, String(a.id));
      const to = locate(draft, String(over.id));
      if (!from || !to || from.columnIndex === to.columnIndex) return;
      setDraft((prev) => {
        if (!prev) return prev;
        const next = prev.map((c) => ({ ...c, cards: [...c.cards] }));
        const [moved] = next[from.columnIndex].cards.splice(from.cardIndex, 1);
        const insertAt = to.cardIndex < 0 ? next[to.columnIndex].cards.length : to.cardIndex;
        next[to.columnIndex].cards.splice(insertAt, 0, moved);
        return next;
      });
    };

    const reset = () => {
      setDraft(null);
      setActive(null);
    };

    const handleDragEnd = ({ active: a, over }: DragEndEvent) => {
      if (!over || !draft || !active) return reset();
      const cur = locate(draft, String(a.id));
      const target = locate(draft, String(over.id));
      if (!cur || !target) return reset();

      let toIndex = cur.cardIndex;
      if (cur.columnIndex === target.columnIndex && target.cardIndex >= 0 && target.cardIndex !== cur.cardIndex) {
        toIndex = arrayMove(draft[cur.columnIndex].cards, cur.cardIndex, target.cardIndex).findIndex((c) => c.id === a.id);
      }
      const toColumnId = draft[cur.columnIndex].id;
      const changed = toColumnId !== active.from.columnId || toIndex !== active.from.cardIndex;
      if (changed) {
        onCardMove?.({
          cardId: String(a.id),
          fromColumnId: active.from.columnId,
          toColumnId,
          fromIndex: active.from.cardIndex,
          toIndex,
        });
      }
      reset();
    };

    const titleOf = (id: string | number | undefined) => {
      if (id === undefined) return "";
      const loc = locate(view, String(id));
      if (!loc) return "";
      return loc.cardIndex < 0 ? view[loc.columnIndex].title : view[loc.columnIndex].cards[loc.cardIndex].title;
    };
    const columnOf = (id: string | number | undefined) => {
      if (id === undefined) return "";
      const loc = locate(view, String(id));
      return loc ? view[loc.columnIndex].title : "";
    };

    const announcements: Announcements = {
      onDragStart: ({ active: a }) => `Picked up ${titleOf(a.id)}. Use arrow keys to move, Space to drop, Escape to cancel.`,
      onDragOver: ({ active: a, over }) => (over ? `${titleOf(a.id)} is over ${columnOf(over.id)}.` : `${titleOf(a.id)} is no longer over a column.`),
      onDragEnd: ({ active: a, over }) => (over ? `${titleOf(a.id)} dropped in ${columnOf(over.id)}.` : `${titleOf(a.id)} dropped.`),
      onDragCancel: ({ active: a }) => `Move cancelled. ${titleOf(a.id)} returned to its column.`,
    };

    const ctx: KanbanContextValue = {
      columns: view,
      readOnly,
      query,
      setQuery,
      dragDisabled: readOnly || normalized.length > 0,
      activeCardId: active?.card.id ?? null,
      matches,
      onCardClick,
      onCardCreate,
      onColumnRename,
      onColumnDelete,
      onColumnCollapse,
    };

    return (
      <KanbanContext.Provider value={ctx}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={reset}
          accessibility={{ announcements }}
        >
          <section
            ref={ref}
            data-agere-component="kanban"
            className={cn("flex min-h-0 flex-col overflow-hidden rounded-xl border bg-background text-foreground", className)}
            {...props}
          >
            {children}
          </section>
          <DragOverlay dropAnimation={{ duration: 160, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
            {active ? (renderOverlay ? renderOverlay(active.card) : <KanbanOverlayCard card={active.card} />) : null}
          </DragOverlay>
        </DndContext>
      </KanbanContext.Provider>
    );
  }
);
Kanban.displayName = "Kanban";

function KanbanOverlayCard({ card }: { card: KanbanCardData }) {
  return (
    <div className="w-[284px] rotate-[1.5deg] cursor-grabbing rounded-lg border border-border-strong bg-card shadow-2xl">
      <KanbanCardContent card={card} />
    </div>
  );
}
