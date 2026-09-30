"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, ListChecks } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { Priority } from "@/db/schema";
import { translator, type Locale } from "@/i18n";
import type { MyTask } from "@/modules/space/queries";
import { DueTag, PriorityTag, StatusIcon } from "./task-bits";

type Row = MyTask & { section: "overdue" | "today" | "week" | "later" | "noDue" | "done" };
const ORDER = ["overdue", "today", "week", "later", "noDue", "done"] as const;
const GRID = "grid grid-cols-[minmax(0,1fr)_200px_150px_110px] items-center gap-3 max-md:grid-cols-[minmax(0,1fr)_120px]";

/** Tugas saya with the list pattern (PRD-06 §6.3, §6.10): sections by due date, Selesai collapsed. */
export function MyTasksList({ slug, locale, today, tasks }: { slug: string; locale: Locale; today: string; tasks: Row[] }) {
  const t = translator(locale);
  const [closed, setClosed] = React.useState<Record<string, boolean>>({ done: true });
  if (!tasks.some((x) => !x.done)) return <EmptyState icon={<ListChecks />} headingLevel="h2" title={t("mytasks.empty")} />;
  return (
    <div className="grid gap-6">
      {ORDER.map((s) => {
        const rows = tasks.filter((x) => x.section === s);
        if (!rows.length) return null;
        const isClosed = closed[s];
        return (
          <section key={s} aria-labelledby={`sec-${s}`}>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-expanded={!isClosed}
                aria-controls={`rows-${s}`}
                onClick={() => setClosed((c) => ({ ...c, [s]: !isClosed }))}
                className="grid size-6 place-items-center rounded-sm text-subtle hover:bg-subtle focus-ring"
              >
                <ChevronRight aria-hidden className={cn("size-4 transition-transform", !isClosed && "rotate-90")} />
                <span className="sr-only">{t(`mytasks.${s}`)}</span>
              </button>
              <h2 id={`sec-${s}`} className={cn("text-sm font-semibold", s === "overdue" ? "text-error-on-surface" : "text-emphasis")}>{t(`mytasks.${s}`)}</h2>
              <span className="text-xs tabular-nums text-subtle">{rows.length}</span>
            </div>
            {!isClosed && (
              <ul id={`rows-${s}`} className="mt-2">
                <li aria-hidden className={cn(GRID, "border-b border-default px-3 pb-2 pl-10 text-xs font-medium text-subtle")}>
                  <span>{t("people.col.name")}</span>
                  <span className="max-md:hidden">{t("task.project")}</span>
                  <span>{t("task.due")}</span>
                  <span className="max-md:hidden">{t("task.priority")}</span>
                </li>
                {rows.map((x) => (
                  <li key={x.id} className="border-b border-default">
                    <Link href={`/${slug}/s/${x.spaceId}/${x.projectId}/papan?task=${x.id}`} className={cn(GRID, "h-11 px-3 hover:bg-subtle focus-ring-inset")}>
                      <span className="flex min-w-0 items-center gap-3">
                        <StatusIcon category={x.done ? "done" : "todo"} className="shrink-0" />
                        <span className={cn("truncate text-sm text-emphasis", x.done && "text-subtle line-through")}>{x.title}</span>
                      </span>
                      <span className="truncate text-sm text-subtle max-md:hidden">{x.projectName}</span>
                      <span>{x.dueDate ? <DueTag t={t} locale={locale} due={x.dueDate} today={today} done={x.done} /> : <span className="text-subtle">—</span>}</span>
                      <span className="max-md:hidden">{x.priority ? <PriorityTag t={t} priority={x.priority as Priority} /> : <span className="text-subtle">—</span>}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
