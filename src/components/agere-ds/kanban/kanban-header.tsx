"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { ChevronRight, Lock, Plus, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AgereAssignee } from "@/lib/agere-tokens";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DatabaseToolbarActions } from "../shared/database-toolbar";
import { ViewSwitcher, type AgereDatabaseView } from "../shared/view-switcher";
import { useKanban } from "./kanban-context";

/* ------------------------------------------------------------------ */
/* KanbanHeader — sticky header region (space context + toolbar)      */
/* ------------------------------------------------------------------ */

export const KanbanHeader = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => (
  <header ref={ref} className={cn("shrink-0 border-b bg-card", className)} {...props} />
));
KanbanHeader.displayName = "KanbanHeader";

/* ------------------------------------------------------------------ */
/* KanbanSpaceContext — "which space am I in" (e.g. agere org)         */
/* ------------------------------------------------------------------ */

export interface KanbanSpaceContextProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Breadcrumb from workspace to this board, e.g. ["Agere", "agere org", "Hiring pipeline"]. */
  path: string[];
  /** Emoji or icon element rendered as the space mark. */
  icon?: React.ReactNode;
  description?: string;
  members?: AgereAssignee[];
  maxMembers?: number;
  isPrivate?: boolean;
  actions?: React.ReactNode;
}

export const KanbanSpaceContext = React.forwardRef<HTMLDivElement, KanbanSpaceContextProps>(
  ({ path, icon, description, members = [], maxMembers = 4, isPrivate, actions, className, ...props }, ref) => {
    const title = path[path.length - 1];
    const trail = path.slice(0, -1);
    const extra = members.length - maxMembers;
    return (
      <div ref={ref} className={cn("flex flex-wrap items-start gap-3 px-4 pb-3 pt-4", className)} {...props}>
        {icon && (
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-md border bg-muted text-base">
            {icon}
          </span>
        )}
        <div className="min-w-[12rem] flex-1">
          {trail.length > 0 && (
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-1 text-2xs text-muted-foreground">
                {trail.map((crumb) => (
                  <li key={crumb} className="inline-flex items-center gap-1">
                    {crumb}
                    <ChevronRight className="size-3" aria-hidden />
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <div className="flex items-center gap-2">
            <h1 className="truncate text-base font-semibold text-foreground">{title}</h1>
            {isPrivate && <Lock className="size-3.5 text-muted-foreground" aria-label="Private space" role="img" />}
          </div>
          {description && <p className="mt-0.5 max-w-prose text-xs text-muted-foreground">{description}</p>}
        </div>
        <div className="flex items-center gap-3">
          {members.length > 0 && (
            <div className="flex items-center gap-2" aria-label={`${members.length} members`}>
              <Users className="size-3.5 text-muted-foreground" aria-hidden />
              <div className="flex -space-x-1">
                {members.slice(0, maxMembers).map((m) => (
                  <Avatar key={m.id} size="sm" name={m.name} src={m.avatarUrl} initials={m.initials} className="ring-2 ring-card" />
                ))}
                {extra > 0 && (
                  <span className="grid size-6 place-items-center rounded-full bg-muted text-2xs text-muted-foreground ring-2 ring-card">+{extra}</span>
                )}
              </div>
            </div>
          )}
          {actions}
        </div>
      </div>
    );
  }
);
KanbanSpaceContext.displayName = "KanbanSpaceContext";

/* ------------------------------------------------------------------ */
/* KanbanToolbar                                                        */
/* ------------------------------------------------------------------ */

export interface KanbanToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  view?: AgereDatabaseView;
  onViewChange?: (view: AgereDatabaseView) => void;
  onFilterClick?: () => void;
  onSortClick?: () => void;
  onNewColumn?: () => void;
  onNewCard?: () => void;
}

export const KanbanToolbar = React.forwardRef<HTMLDivElement, KanbanToolbarProps>(
  ({ view = "board", onViewChange, onFilterClick, onSortClick, onNewColumn, onNewCard, className, children, ...props }, ref) => {
    const { query, setQuery, readOnly } = useKanban();
    return (
      <div ref={ref} className={cn("flex min-h-12 flex-wrap items-center gap-2 border-t px-4 py-2", className)} {...props}>
        {onViewChange && <ViewSwitcher value={view} onValueChange={onViewChange} label="Board views" />}
        <div className="flex-1" />
        {query && <span className="hidden text-2xs text-muted-foreground md:inline">Clear search to reorder</span>}
        <DatabaseToolbarActions
          searchValue={query}
          onSearchChange={setQuery}
          searchLabel="Search cards"
          onFilterClick={onFilterClick}
          onSortClick={onSortClick}
        />
        {children}
        {!readOnly && onNewColumn && (
          <Button variant="outline" onClick={onNewColumn}>
            <Plus aria-hidden />
            <span className="hidden xl:inline">New column</span>
            <span className="sr-only xl:hidden">New column</span>
          </Button>
        )}
        {!readOnly && onNewCard && (
          <Button shape="pill" onClick={onNewCard}>
            <Plus aria-hidden /> New card
          </Button>
        )}
      </div>
    );
  }
);
KanbanToolbar.displayName = "KanbanToolbar";

/* ------------------------------------------------------------------ */
/* KanbanBoard — horizontal scroll lane                                 */
/* ------------------------------------------------------------------ */

export interface KanbanBoardProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

export const KanbanBoard = React.forwardRef<HTMLDivElement, KanbanBoardProps>(({ asChild, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      ref={ref}
      className={cn("flex min-h-0 flex-1 items-start gap-3 overflow-x-auto p-4", className)}
      {...props}
    />
  );
});
KanbanBoard.displayName = "KanbanBoard";
