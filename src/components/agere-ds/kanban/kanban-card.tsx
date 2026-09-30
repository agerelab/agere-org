"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckSquare, Clock3, GripVertical, MessageSquare, Paperclip } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatShortDate, isOverdue } from "@/lib/date";
import { TASK_STATUS_META, toTaskPriority } from "@/lib/workspace";
import { Progress } from "@/components/ui/progress";
import { AssigneeStack, PriorityFlag, StatusIndicator } from "../workspace/task-fields";
import { PropertyTag } from "../shared/property-tag";
import { useKanban } from "./kanban-context";
import type { KanbanCardData } from "./types";

/* ------------------------------------------------------------------ */
/* KanbanCard — sortable shell. Compose any content inside it.        */
/* ------------------------------------------------------------------ */

export interface KanbanCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onClick"> {
  card: KanbanCardData;
  /** Defaults to <KanbanCardContent card={card} />. */
  children?: React.ReactNode;
}

export const KanbanCard = React.forwardRef<HTMLDivElement, KanbanCardProps>(({ card, className, children, ...props }, ref) => {
  const { dragDisabled, onCardClick, activeCardId } = useKanban();
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: card.id,
    disabled: dragDisabled,
  });

  const mergedRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref, setNodeRef]
  );

  return (
    <div
      ref={mergedRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-dragging={isDragging || undefined}
      className={cn(
        "group/card relative rounded-lg border bg-card text-left shadow-elevation-1 transition-[box-shadow,border-color,opacity] duration-fast",
        "hover:border-border-strong hover:shadow-elevation-2",
        "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus",
        isDragging && "opacity-40",
        activeCardId && !isDragging && "pointer-events-none",
        className
      )}
      {...props}
    >
      {/* The whole surface opens the card; the grip is the drag handle (pointer + keyboard). */}
      <button
        type="button"
        onClick={() => onCardClick?.(card.id)}
        className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none"
        aria-label={`Open ${card.title}`}
      />
      {!dragDisabled && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Move ${card.title}`}
          aria-roledescription="draggable card"
          className={cn(
            "absolute left-1 top-2.5 z-10 grid size-5 cursor-grab place-items-center rounded-sm text-muted-foreground/60",
            "opacity-0 transition-opacity group-hover/card:opacity-100 focus-visible:opacity-100 focus-ring",
            "active:cursor-grabbing"
          )}
        >
          <GripVertical className="size-3.5" aria-hidden />
        </button>
      )}
      <div className="pointer-events-none relative z-[1]">{children ?? <KanbanCardContent card={card} />}</div>
    </div>
  );
});
KanbanCard.displayName = "KanbanCard";

/* ------------------------------------------------------------------ */
/* KanbanCardContent — ClickUp-style card anatomy                      */
/*   list · key → title → tags → progress → assignees · due · priority · */
/*   subtasks · attachments · comments                                  */
/* ------------------------------------------------------------------ */

export interface KanbanCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  card: KanbanCardData;
  maxTags?: number;
}

export const KanbanCardContent = React.forwardRef<HTMLDivElement, KanbanCardContentProps>(
  ({ card, maxTags = 3, className, ...props }, ref) => {
    const done = card.status ? TASK_STATUS_META[card.status].done : false;
    const overdue = !done && isOverdue(card.dueDate);
    const wsPriority = card.taskPriority ?? toTaskPriority(card.priority);
    const assignees = card.assignees ?? (card.assignee ? [card.assignee] : []);
    const extraTags = (card.tags?.length ?? 0) - maxTags;
    const sub = card.subtasks ?? (card.checklistCount ? { total: card.checklistCount, done: card.checklistCompleted ?? 0 } : undefined);
    const progress = card.progress ?? (sub && sub.total ? Math.round((sub.done / sub.total) * 100) : undefined);

    return (
      <div ref={ref} className={cn("overflow-hidden rounded-lg", className)} {...props}>
        {card.coverImageUrl && (
          <div className="relative h-24 overflow-hidden border-b">
            <img src={card.coverImageUrl} alt="" className="size-full object-cover opacity-90" />
          </div>
        )}
        <div className="grid gap-2 p-card pl-6">
          {(card.list || card.taskKey) && (
            <p className="flex min-w-0 items-center gap-1.5 text-2xs text-subtle">
              {card.list && <span className="truncate">{card.list}</span>}
              {card.list && card.taskKey && <span aria-hidden>·</span>}
              {card.taskKey && <span className="shrink-0 font-mono">{card.taskKey}</span>}
            </p>
          )}
          <div className="flex items-start gap-2">
            {card.status && <StatusIndicator status={card.status} labelled size={14} className="mt-[3px]" />}
            <h3 className={cn("line-clamp-2 min-w-0 flex-1 text-dense font-medium text-emphasis", done && "text-subtle line-through decoration-1")}>{card.title}</h3>
          </div>

          {card.tags?.length ? (
            <div className="flex flex-wrap gap-1">
              {card.tags.slice(0, maxTags).map((tag) => <PropertyTag key={tag.id} tag={tag} className="max-w-[130px]" />)}
              {extraTags > 0 && <span className="text-2xs text-subtle">+{extraTags}</span>}
            </div>
          ) : null}

          {progress !== undefined && (
            <div className="flex items-center gap-2">
              <Progress value={progress} aria-label={`${card.title} progress`} tone={progress === 100 ? "success" : "default"} className="flex-1" />
              <span className="text-2xs text-subtle tabular-nums">{progress}%</span>
            </div>
          )}

          <div className="flex min-h-6 items-center gap-2.5 text-2xs text-subtle">
            {assignees.length > 0 && <AssigneeStack members={assignees} max={3} size="xs" />}
            {card.dueDate && (
              <span className={cn("inline-flex items-center gap-1 tabular-nums", overdue && "font-medium text-error-on-surface")}>
                <Clock3 className="size-3" aria-hidden />
                {overdue && <span className="sr-only">Overdue, </span>}
                {formatShortDate(card.dueDate)}
              </span>
            )}
            {wsPriority && <PriorityFlag priority={wsPriority} className="[&_svg]:size-3" />}
            <span className="ml-auto flex items-center gap-2">
              {sub && sub.total > 0 && (
                <span className={cn("inline-flex items-center gap-0.5 tabular-nums", sub.done === sub.total && "text-success-on-surface")} aria-label={`${sub.done} of ${sub.total} subtasks done`}>
                  <CheckSquare className="size-3" aria-hidden />{sub.done}/{sub.total}
                </span>
              )}
              {card.attachmentCount ? (
                <span className="inline-flex items-center gap-0.5" aria-label={`${card.attachmentCount} attachments`}><Paperclip className="size-3" aria-hidden />{card.attachmentCount}</span>
              ) : null}
              {card.commentCount ? (
                <span className="inline-flex items-center gap-0.5" aria-label={`${card.commentCount} comments`}><MessageSquare className="size-3" aria-hidden />{card.commentCount}</span>
              ) : null}
            </span>
          </div>
        </div>
      </div>
    );
  }
);
KanbanCardContent.displayName = "KanbanCardContent";
