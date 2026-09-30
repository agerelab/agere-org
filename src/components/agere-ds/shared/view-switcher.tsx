"use client";

import * as React from "react";
import { CalendarDays, KanbanSquare, Table2, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type AgereDatabaseView = "calendar" | "table" | "board";

const VIEW_META: Record<AgereDatabaseView, { label: string; icon: LucideIcon }> = {
  calendar: { label: "Calendar", icon: CalendarDays },
  table: { label: "Table", icon: Table2 },
  board: { label: "Board", icon: KanbanSquare },
};

export interface ViewSwitcherProps
  extends Omit<React.ComponentPropsWithoutRef<typeof Tabs>, "value" | "onValueChange" | "defaultValue"> {
  value: AgereDatabaseView;
  onValueChange: (view: AgereDatabaseView) => void;
  views?: AgereDatabaseView[];
  /** Accessible name for the tablist. */
  label?: string;
  /** Hide text labels below this breakpoint (icons stay; names stay in aria-label). */
  compactBelow?: "sm" | "md" | "lg";
}

/**
 * Shared Calendar / Table / Board switcher (role="tablist", aria-selected via Radix Tabs).
 * Kanban, Calendar and DataTable all use it so the database vocabulary stays identical.
 */
export const ViewSwitcher = React.forwardRef<HTMLDivElement, ViewSwitcherProps>(
  ({ value, onValueChange, views = ["calendar", "table", "board"], label = "Database views", compactBelow = "lg", className, ...props }, ref) => {
    const hideLabel = { sm: "hidden sm:inline", md: "hidden md:inline", lg: "hidden lg:inline" }[compactBelow];
    return (
      <Tabs ref={ref} variant="segmented" value={value} onValueChange={(v) => onValueChange(v as AgereDatabaseView)} className={className} {...props}>
        <TabsList aria-label={label}>
          {views.map((view) => {
            const { label: viewLabel, icon: Icon } = VIEW_META[view];
            return (
              <TabsTrigger key={view} value={view} aria-label={viewLabel}>
                <Icon aria-hidden />
                <span className={cn(hideLabel)}>{viewLabel}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    );
  }
);
ViewSwitcher.displayName = "ViewSwitcher";
