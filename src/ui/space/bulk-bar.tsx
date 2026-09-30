"use client";

// Multi-select bar of the list pattern (PRD-06 §6.10, US-18): "{n} dipilih · Tandai selesai ·
// Tugaskan · ✕", floating at the bottom. The result toast names what was skipped.
import * as React from "react";
import { CheckCheck, UserPlus, X } from "lucide-react";
import { Button, IconButton } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import type { translator } from "@/i18n";
import type { Assignee } from "@/modules/space/tasks";
import { assignTasksAction, completeTasksAction } from "@/app/[slug]/s/actions";

type T = ReturnType<typeof translator>;

export function BulkBar({ t, slug, ids, assignees, onDone }: { t: T; slug: string; ids: string[]; assignees?: { type: "user" | "team"; id: string; name: string }[]; onDone: () => void }) {
  const [pending, start] = React.useTransition();
  const report = (r: Awaited<ReturnType<typeof completeTasksAction>>, doneKey: "bulk.completed" | "bulk.assigned") => {
    if (!r.ok) return void toast.error(t(r.error));
    const skipped = doneKey === "bulk.completed" ? "bulk.skippedComplete" : "bulk.skippedAssign";
    const msg = t(doneKey, String(r.done)) + (r.skipped ? ` ${t(skipped, String(r.skipped))}` : "");
    if (r.skipped) toast.info(msg);
    else toast.success(msg);
    onDone();
  };
  const assign = (a: Assignee) => start(async () => report(await assignTasksAction(slug, ids, a), "bulk.assigned"));
  if (!ids.length) return null;
  return (
    <div role="region" aria-label={t("bulk.region")} className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+16px)] z-40 flex justify-center px-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-default bg-card px-3 py-2 shadow-lg">
        <span className="px-1 text-sm font-medium tabular-nums text-emphasis" aria-live="polite">{t("bulk.selected", String(ids.length))}</span>
        <Button size="sm" variant="outline" loading={pending} onClick={() => start(async () => report(await completeTasksAction(slug, ids), "bulk.completed"))}>
          <CheckCheck aria-hidden />
          {t("bulk.complete")}
        </Button>
        {assignees && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={pending}>
                <UserPlus aria-hidden />
                {t("bulk.assign")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="max-h-72 overflow-y-auto">
              <DropdownMenuItem onSelect={() => assign(null)}>{t("task.none")}</DropdownMenuItem>
              <DropdownMenuSeparator />
              {assignees.map((a) => (
                <DropdownMenuItem key={a.id} onSelect={() => assign({ type: a.type, id: a.id })}>{a.name}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <IconButton size="sm" variant="ghost" label={t("bulk.clear")} icon={<X />} onClick={onDone} />
      </div>
    </div>
  );
}
