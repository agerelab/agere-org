"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { CalendarDays, ChartGantt, FileText, KanbanSquare, List, MessagesSquare, Plus, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { WorkspaceView } from "@/lib/workspace";

export const VIEW_META: Record<WorkspaceView, { label: string; icon: LucideIcon }> = {
  list: { label: "List", icon: List },
  board: { label: "Board", icon: KanbanSquare },
  calendar: { label: "Calendar", icon: CalendarDays },
  gantt: { label: "Gantt", icon: ChartGantt },
  doc: { label: "Doc", icon: FileText },
  chat: { label: "Chat", icon: MessagesSquare },
};

export interface ViewSwitcherBarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  value: WorkspaceView;
  onValueChange: (view: WorkspaceView) => void;
  views?: WorkspaceView[];
  /** Leading context: list name, breadcrumb or space icon. */
  leading?: React.ReactNode;
  /** Trailing controls: share, automations, "…". */
  actions?: React.ReactNode;
  onAddView?: () => void;
  /** Counts shown next to a view label, e.g. { chat: 3 } unread. */
  badges?: Partial<Record<WorkspaceView, number>>;
  label?: string;
  /** Render view panels as children (<ViewSwitcherPanel value="list">…) to get full tab semantics. */
  children?: React.ReactNode;
}

/**
 * ClickUp view bar: List · Board · Calendar · Gantt · Doc · Chat + “View”.
 * role="tablist" with roving focus (←/→, Home/End). Scrolls horizontally on narrow screens.
 */
export const ViewSwitcherBar = React.forwardRef<HTMLDivElement, ViewSwitcherBarProps>(
  ({ value, onValueChange, views = ["list", "board", "calendar", "gantt", "doc", "chat"], leading, actions, onAddView, badges, label = "Views", className, children, ...props }, ref) => (
    <TabsPrimitive.Root value={value} onValueChange={(v) => onValueChange(v as WorkspaceView)} activationMode="automatic" className="flex min-h-0 flex-1 flex-col">
      <div ref={ref} className={cn("flex min-h-11 items-center gap-3 border-b border-subtle bg-default px-3 sm:px-4", className)} {...props}>
        {leading && <div className="flex shrink-0 items-center gap-2 border-r border-subtle pr-3">{leading}</div>}
        <div className="-mb-px flex min-w-0 flex-1 items-center overflow-x-auto [scrollbar-width:none]">
          <TabsPrimitive.List aria-label={label} className="flex items-center gap-0.5">
            {views.map((v) => {
              const { label: l, icon: Icon } = VIEW_META[v];
              const n = badges?.[v];
              return (
                <TabsPrimitive.Trigger
                  key={v}
                  value={v}
                  className={cn(
                    "group/view relative inline-flex h-11 shrink-0 items-center gap-1.5 px-2.5 text-dense font-medium text-subtle transition-colors",
                    "hover:text-emphasis focus-ring-inset",
                    "after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent",
                    "data-[state=active]:text-emphasis data-[state=active]:after:bg-brand"
                  )}
                >
                  <Icon aria-hidden className="size-dense-icon" />
                  {l}
                  {n ? (
                    <span className="rounded-full bg-error-solid px-1.5 text-2xs font-semibold leading-4 text-error-on-solid tabular-nums">
                      {n}<span className="sr-only"> unread</span>
                    </span>
                  ) : null}
                </TabsPrimitive.Trigger>
              );
            })}
          </TabsPrimitive.List>
          {onAddView && (
            <button type="button" onClick={onAddView} className="ml-1 inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-dense font-medium text-subtle hover:bg-subtle hover:text-emphasis focus-ring">
              <Plus aria-hidden className="size-3.5" /> View
            </button>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
      </div>
      {children}
    </TabsPrimitive.Root>
  )
);
ViewSwitcherBar.displayName = "ViewSwitcherBar";

export const ViewSwitcherPanel = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>>(
  ({ className, ...props }, ref) => <TabsPrimitive.Content ref={ref} className={cn("min-h-0 flex-1 outline-none", className)} {...props} />
);
ViewSwitcherPanel.displayName = "ViewSwitcherPanel";
