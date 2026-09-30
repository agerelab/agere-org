"use client";

// Small task visuals shared by Papan, Daftar and Tugas saya: status icon, priority, due date.
import { Circle, CircleCheck, CircleDashed, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ColumnCategory, Priority } from "@/db/schema";
import type { Locale, translator } from "@/i18n";
import { formatDateShort } from "@/i18n/format";

type T = ReturnType<typeof translator>;

export function StatusIcon({ category, className }: { category: ColumnCategory; className?: string }) {
  if (category === "done") return <CircleCheck aria-hidden className={cn("size-4 text-task-status-complete", className)} />;
  if (category === "in_progress") return <CircleDashed aria-hidden className={cn("size-4 text-task-status-in-progress", className)} />;
  return <Circle aria-hidden className={cn("size-4 text-task-status-todo", className)} />;
}

const PRIORITY_CLASS: Record<Priority, string> = { urgent: "text-priority-urgent", high: "text-priority-high", medium: "text-priority-normal", low: "text-subtle" };

/** Priority always shows its word (PRD-06 §5 Should); "Rendah" uses fg-subtle for contrast (UI-01). */
export function PriorityTag({ t, priority }: { t: T; priority: Priority | null }) {
  if (!priority) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap text-xs", PRIORITY_CLASS[priority])}>
      <Flag aria-hidden className="size-3" />
      {t(`priority.${priority}`)}
    </span>
  );
}

/** Due date; overdue uses error-on-surface and the word "Terlambat" (PRD-06 §8, never colour alone). */
export function DueTag({ t, locale, due, today, done }: { t: T; locale: Locale; due: string | null; today: string; done: boolean }) {
  if (!due) return null;
  const label = formatDateShort(locale, new Date(`${due}T00:00:00Z`), "UTC");
  const overdue = !done && due < today;
  return (
    <span className={cn("whitespace-nowrap text-xs", overdue ? "text-error-on-surface" : "text-subtle")}>
      {overdue ? t("task.overdueSince", label) : label}
    </span>
  );
}
