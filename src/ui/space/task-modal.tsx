"use client";

// Task detail modal, layout v2 (PRD-06 §8.1, D41): detail pane with properties and description,
// sticky footer while there are unsaved changes, and an activity pane with comments.
import * as React from "react";
import { MoreHorizontal, SendHorizontal, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button, IconButton } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { Priority } from "@/db/schema";
import type { Locale, translator } from "@/i18n";
import { formatDateShort, formatTime } from "@/i18n/format";
import { atLeast, type Level } from "@/modules/authz/levels";
import { addCommentAction, deleteTaskAction, moveTaskAction, taskDetailAction, updateTaskAction } from "@/app/[slug]/s/actions";
import type { BoardColumn } from "./board";
import { AssigneeSelect, DueInput, PrioritySelect, StatusSelect, type AssigneeOption } from "./task-fields";

type T = ReturnType<typeof translator>;
type Detail = NonNullable<Awaited<ReturnType<typeof taskDetailAction>>>;
type Draft = { title: string; description: string; columnId: string; assignee: AssigneeOption | null; dueDate: string | null; priority: Priority | null };

export function TaskModal({ t, locale, slug, taskId, projectName, assignees, onClose }: { t: T; locale: Locale; slug: string; taskId: string; projectName: string; assignees: AssigneeOption[]; onClose: () => void }) {
  const [detail, setDetail] = React.useState<Detail | null | "missing">(null);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [comment, setComment] = React.useState("");
  const [confirmClose, setConfirmClose] = React.useState(false);
  const [pending, start] = React.useTransition();

  const apply = React.useCallback(
    (d: Detail | null) => {
      setDetail(d ?? "missing");
      if (!d) return;
      const a = d.assignee ? { ...d.assignee, name: assignees.find((o) => o.id === d.assignee!.id)?.name ?? "—" } : null;
      setDraft({ title: d.title, description: d.description, columnId: d.columnId, assignee: a, dueDate: d.dueDate, priority: d.priority });
    },
    [assignees],
  );
  const load = React.useCallback(() => taskDetailAction(slug, taskId).then(apply), [slug, taskId, apply]);

  React.useEffect(() => {
    let live = true;
    taskDetailAction(slug, taskId).then((d) => live && apply(d));
    return () => {
      live = false;
    };
  }, [slug, taskId, apply]);

  const d = detail && detail !== "missing" ? detail : null;
  const canEdit = !!d && atLeast(d.level as Level, "edit") && !d.archived;
  const canManage = !!d && atLeast(d.level as Level, "manage");
  const dirty =
    !!d &&
    !!draft &&
    (draft.title !== d.title || draft.description !== d.description || draft.columnId !== d.columnId || (draft.assignee?.id ?? null) !== (d.assignee?.id ?? null) || draft.dueDate !== d.dueDate || draft.priority !== d.priority);

  const requestClose = () => (dirty ? setConfirmClose(true) : onClose());

  const save = () =>
    start(async () => {
      if (!d || !draft) return;
      const patch: Parameters<typeof updateTaskAction>[3] = {};
      if (draft.title !== d.title) patch.title = draft.title;
      if (draft.description !== d.description) patch.description = draft.description;
      if ((draft.assignee?.id ?? null) !== (d.assignee?.id ?? null)) patch.assignee = draft.assignee ? { type: draft.assignee.type, id: draft.assignee.id } : null;
      if (draft.dueDate !== d.dueDate) patch.dueDate = draft.dueDate;
      if (draft.priority !== d.priority) patch.priority = draft.priority;
      let version = d.version;
      if (Object.keys(patch).length) {
        const r = await updateTaskAction(slug, d.id, version, patch);
        if (!r.ok) return void toast.error(t(r.error), r.conflict ? { action: { label: t("project.reload"), onClick: () => void load() } } : undefined);
        version = r.version;
      }
      if (draft.columnId !== d.columnId) {
        const r = await moveTaskAction(slug, d.id, version, draft.columnId, Number.MAX_SAFE_INTEGER);
        if (!r.ok) return void toast.error(t(r.error));
      }
      toast.success(t("task.saved"));
      await load();
    });

  const send = () =>
    start(async () => {
      if (!d || !comment.trim()) return;
      const r = await addCommentAction(slug, d.id, comment);
      if (!r.ok) return void toast.error(t(r.error));
      setComment("");
      await load();
    });

  const field = (label: string, id: string, control: React.ReactNode) => (
    <div className="grid min-h-10 grid-cols-[160px_minmax(0,1fr)] items-center gap-3 max-sm:grid-cols-1">
      <label htmlFor={id} className="text-sm text-subtle">{label}</label>
      <div className="max-w-sm">{control}</div>
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && requestClose()}>
      <DialogContent padded={false} hideClose className="max-h-[min(820px,calc(100dvh-48px))] w-[min(1200px,calc(100vw-48px))] max-w-none sm:max-w-none max-md:h-dvh max-md:max-h-dvh max-md:w-screen max-md:rounded-none">
        <div className="flex h-14 flex-none items-center gap-2 border-b border-default px-4">
          <DialogTitle className="min-w-0 flex-1 truncate text-sm font-normal text-subtle">{projectName}</DialogTitle>
          <DialogDescription className="sr-only">{d?.title ?? ""}</DialogDescription>
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton size="sm" label={t("people.actions", d?.title ?? "")} icon={<MoreHorizontal />} tooltip={false} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  destructive
                  onSelect={() =>
                    start(async () => {
                      const r = await deleteTaskAction(slug, taskId);
                      if (!r.ok) return void toast.error(t(r.error));
                      toast.success(t("task.deleted"));
                      onClose();
                    })
                  }
                >
                  <Trash2 aria-hidden className="size-4" />
                  {t("task.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button variant="ghost" size="sm" onClick={requestClose}>{t("common.cancel")}</Button>
        </div>

        {detail === "missing" ? (
          <p className="p-8 text-sm text-subtle">{t("people.error.notFound")}</p>
        ) : !d || !draft ? (
          <div className="grid gap-3 p-8" aria-busy>
            <div className="h-8 w-2/3 animate-pulse rounded bg-subtle" />
            <div className="h-40 animate-pulse rounded bg-subtle" />
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_400px] max-md:grid-cols-1 max-md:overflow-y-auto">
            <div className="flex min-h-0 flex-col">
              <div className="grid min-h-0 flex-1 content-start gap-7 overflow-y-auto px-8 py-6 max-md:overflow-visible max-md:px-4">
                <input
                  aria-label={t("task.title")}
                  autoFocus
                  readOnly={!canEdit}
                  maxLength={200}
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  className="type-heading-xl w-full rounded-md bg-transparent px-2 py-1 text-emphasis outline-none hover:bg-muted focus:bg-muted"
                />
                <div className="grid gap-1 border-y border-default py-3">
                  {field(t("task.status"), "f-status", <StatusSelect id="f-status" t={t} columns={d.columns as BoardColumn[]} value={draft.columnId} onChange={(v) => setDraft({ ...draft, columnId: v })} disabled={!canEdit} />)}
                  {field(t("task.assignee"), "f-assignee", <AssigneeSelect id="f-assignee" t={t} options={assignees} value={draft.assignee} onChange={(v) => setDraft({ ...draft, assignee: v })} disabled={!canEdit} />)}
                  {field(t("task.due"), "f-due", <DueInput id="f-due" t={t} value={draft.dueDate} onChange={(v) => setDraft({ ...draft, dueDate: v })} disabled={!canEdit} />)}
                  {field(t("task.priority"), "f-priority", <PrioritySelect id="f-priority" t={t} value={draft.priority} onChange={(v) => setDraft({ ...draft, priority: v })} disabled={!canEdit} />)}
                  {field(t("task.project"), "f-project", <span id="f-project" className="text-sm">{projectName}</span>)}
                  {field(t("task.created"), "f-created", <span id="f-created" className="text-sm">{t("task.createdBy", formatDateShort(locale, new Date(d.createdAt)), d.createdBy)}</span>)}
                </div>
                <div className="grid gap-2">
                  <label htmlFor="f-desc" className="text-sm font-medium text-emphasis">{t("task.description")}</label>
                  <Textarea
                    id="f-desc"
                    rows={6}
                    readOnly={!canEdit}
                    maxLength={10000}
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    className="border-transparent bg-transparent shadow-none hover:bg-muted focus:bg-muted"
                  />
                </div>
              </div>
              {dirty && (
                <div className="flex flex-none items-center gap-3 border-t border-default px-6 py-3">
                  <span className="text-sm text-attention-on-surface">⚠ {t("task.unsaved")}</span>
                  <span className="ml-auto flex gap-2">
                    <Button variant="ghost" onClick={() => void load()}>{t("common.cancel")}</Button>
                    <Button disabled={pending || !draft.title.trim()} onClick={save}>{t("task.save")}</Button>
                  </span>
                </div>
              )}
            </div>
            <aside aria-label={t("task.activity")} className="flex min-h-0 flex-col border-l border-default bg-muted max-md:border-l-0 max-md:border-t">
              <h2 className="flex-none px-5 pt-5 text-sm font-semibold text-emphasis">{t("task.activity")}</h2>
              <ol className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto px-5 py-4">
                {d.comments.length === 0 && <li className="text-sm text-subtle">{t("task.noComments")}</li>}
                {d.comments.map((c) => (
                  <li key={c.id} className="flex gap-3">
                    <Avatar name={c.author} size="sm" />
                    <div className="grid min-w-0 gap-0.5">
                      <p className="text-xs text-subtle">
                        <span className="font-medium text-emphasis">{c.author}</span> · {formatDateShort(locale, new Date(c.createdAt))} {formatTime(locale, new Date(c.createdAt))}
                      </p>
                      <p className="whitespace-pre-wrap break-words text-sm">{c.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              {canEdit && (
                <form
                  className="flex-none grid gap-1.5 border-t border-default px-5 py-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    send();
                  }}
                >
                  <label htmlFor="f-comment" className="text-sm font-medium">{t("task.comment")}</label>
                  <div className="flex items-end gap-2 rounded-md border border-control bg-default p-2">
                    <textarea
                      id="f-comment"
                      rows={2}
                      value={comment}
                      aria-describedby="f-comment-hint"
                      onChange={(e) => setComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          send();
                        }
                      }}
                      className="min-h-10 flex-1 resize-none bg-transparent text-sm outline-none"
                    />
                    <IconButton type="submit" size="sm" variant="default" label={t("task.send")} icon={<SendHorizontal />} disabled={pending || !comment.trim()} />
                  </div>
                  <p id="f-comment-hint" className="text-xs text-subtle">{t("task.commentHint")}</p>
                </form>
              )}
            </aside>
          </div>
        )}
        {confirmClose && (
          <div role="alertdialog" aria-label={t("task.unsaved")} className={cn("absolute inset-x-0 bottom-0 flex items-center gap-3 border-t border-default bg-attention-bg px-6 py-3")}>
            <span className="text-sm text-attention-fg">{t("task.unsaved")}</span>
            <span className="ml-auto flex gap-2">
              <Button variant="ghost" onClick={() => setConfirmClose(false)}>{t("common.cancel")}</Button>
              <Button variant="destructive" onClick={onClose}>{t("task.discard")}</Button>
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
