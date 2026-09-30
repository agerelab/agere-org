"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, ChevronLeft, Lock, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FormControl, FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PageHeader, PageHeaderActions, PageHeaderContent, PageHeaderDescription, PageHeaderTitle } from "@/components/ui/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { ColumnCategory } from "@/db/schema";
import { translator, type Locale, type MessageKey } from "@/i18n";
import { atLeast } from "@/modules/authz/levels";
import type { projectBoard } from "@/modules/space/queries";
import { Board, type BoardColumn, type BoardTask, type Move } from "@/ui/space/board";
import { initials } from "@/ui/space/icons";
import { TaskListView } from "@/ui/space/list";
import { NewTaskDialog } from "@/ui/space/new-task-dialog";
import { rememberView } from "@/ui/space/project-landing";
import { TaskModal } from "@/ui/space/task-modal";
import {
  createBoardAction,
  createColumnAction,
  createTaskAction,
  deleteColumnAction,
  deleteProjectAction,
  moveTaskAction,
  renameColumnAction,
  setArchivedAction,
} from "../../../actions";

type Data = Awaited<ReturnType<typeof projectBoard>>;
type Props = { slug: string; locale: Locale; view: "daftar" | "papan"; spaceName: string; data: Data; override: boolean; today: string; openTask: string | null };
type Dialogs = { kind: "task"; columnId?: string } | { kind: "board" } | { kind: "column" } | { kind: "rename"; column: BoardColumn } | { kind: "trash" } | null;

/** Applies a move to the local list the way the server will (end or index within the target column). */
function applyMove(tasks: BoardTask[], m: Move): BoardTask[] {
  const moved = tasks.find((x) => x.id === m.taskId);
  if (!moved) return tasks;
  const rest = tasks.filter((x) => x.id !== m.taskId);
  const inColumn = rest.filter((x) => x.columnId === m.columnId);
  const anchor = inColumn[m.index];
  const updated = { ...moved, columnId: m.columnId };
  if (!anchor) {
    const last = inColumn.at(-1);
    const at = last ? rest.indexOf(last) + 1 : rest.length;
    return [...rest.slice(0, at), updated, ...rest.slice(at)];
  }
  const at = rest.indexOf(anchor);
  return [...rest.slice(0, at), updated, ...rest.slice(at)];
}

export function ProjectScreen({ slug, locale, view, spaceName, data, override, today, openTask }: Props) {
  const t = translator(locale);
  const router = useRouter();
  const base = `/${slug}/s/${data.project.spaceId}/${data.project.id}`;
  const [optimistic, addMove] = React.useOptimistic(data.tasks as BoardTask[], applyMove);
  const [, startMove] = React.useTransition();
  const [pending, start] = React.useTransition();
  const [assigneeFilter, setAssigneeFilter] = React.useState("all");
  const [taskId, setTaskId] = React.useState<string | null>(openTask);
  const [dialog, setDialog] = React.useState<Dialogs>(null);
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState<ColumnCategory>("in_progress");
  const [error, setError] = React.useState<MessageKey | null>(null);

  const canEdit = atLeast(data.level, "edit") && !data.project.archived;
  const canManage = atLeast(data.level, "manage");
  const tasks = optimistic.filter((x) => assigneeFilter === "all" || (assigneeFilter === "none" ? !x.assignee : x.assignee?.id === assigneeFilter));
  const openCount = data.tasks.filter((x) => !x.done).length;

  React.useEffect(() => rememberView(data.project.id, view), [data.project.id, view]);

  const openModal = (id: string | null) => {
    setTaskId(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("task", id);
    else url.searchParams.delete("task");
    window.history.replaceState(null, "", url);
  };

  const move = (m: Move) => {
    const task = data.tasks.find((x) => x.id === m.taskId);
    if (!task) return;
    startMove(async () => {
      addMove(m);
      const r = await moveTaskAction(slug, m.taskId, task.version, m.columnId, m.index);
      if (!r.ok) toast.error(t(r.error), r.conflict ? { action: { label: t("project.reload"), onClick: () => router.refresh() } } : undefined);
    });
  };

  const quickAdd = async (columnId: string, title: string) => {
    const r = await createTaskAction(slug, data.project.id, { title, boardId: data.board.id, columnId });
    if (!r.ok) toast.error(t(r.error));
    return r.ok;
  };

  const tab = (v: "daftar" | "papan", label: string) => (
    <Link
      href={`${base}/${v}${data.boards.length > 1 ? `?papan=${data.board.id}` : ""}`}
      role="tab"
      aria-selected={view === v}
      className={cn("inline-flex h-10 items-center gap-1.5 border-b-2 px-1 text-sm font-medium focus-ring", view === v ? "border-foreground text-emphasis" : "border-transparent text-subtle hover:text-emphasis")}
    >
      {label}
      <span className="rounded-full bg-subtle px-1.5 text-xs tabular-nums text-subtle">{openCount}</span>
    </Link>
  );

  const columnMenu = (c: BoardColumn) =>
    canEdit ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton size="xs" label={t("people.actions", c.name)} icon={<MoreHorizontal />} tooltip={false} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => (setName(c.name), setError(null), setDialog({ kind: "rename", column: c }))}>
            <Pencil aria-hidden className="size-4" />
            {t("team.rename")}
          </DropdownMenuItem>
          <DropdownMenuItem
            destructive
            onSelect={() =>
              start(async () => {
                const r = await deleteColumnAction(slug, c.id);
                if (!r.ok) toast.error(t(r.error));
              })
            }
          >
            <Trash2 aria-hidden className="size-4" />
            {t("people.action.remove")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null;

  const nameDialog = (title: string, label: string, submit: () => Promise<{ ok: boolean; error?: MessageKey }>, extra?: React.ReactNode) => (
    <Dialog open onOpenChange={(o) => !o && setDialog(null)}>
      <DialogContent size="sm" closeLabel={t("common.cancel")}>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await submit();
              if (!r.ok) return setError(r.error ?? "people.error.generic");
              setDialog(null);
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <FormField label={label} error={error ? t(error) : undefined} required>
            <FormControl>
              <Input autoFocus maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
            </FormControl>
          </FormField>
          {extra}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialog(null)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={pending || !name.trim()}>{t("common.save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="flex min-h-full flex-col gap-4 px-4 pb-10 pt-6 md:px-10">
      <Link href={`/${slug}/s/${data.project.spaceId}`} className="inline-flex items-center gap-1 self-start rounded-sm text-sm text-subtle hover:text-emphasis focus-ring">
        <ChevronLeft aria-hidden className="size-4" />
        {spaceName}
      </Link>
      <PageHeader>
        <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-xl border border-default text-base font-semibold max-md:hidden">{initials(data.project.name)}</span>
        <PageHeaderContent>
          <PageHeaderTitle
            badges={
              <>
                {data.project.restricted && <Badge variant="secondary" startIcon={<Lock />}>{t("space.restricted")}</Badge>}
                {override && <Badge variant="attention">{t("project.adminAccess")}</Badge>}
              </>
            }
          >
            {data.project.name}
          </PageHeaderTitle>
          {data.project.description && <PageHeaderDescription>{data.project.description}</PageHeaderDescription>}
        </PageHeaderContent>
        <PageHeaderActions
          primary={canEdit ? { label: t("task.new"), icon: <Plus />, onSelect: () => setDialog({ kind: "task" }) } : undefined}
          menuLabel={t("people.actions", data.project.name)}
          menu={
            canManage
              ? [
                  data.project.archived
                    ? { label: t("project.restore"), icon: <ArchiveRestore />, onSelect: () => start(async () => void (await setArchivedAction(slug, data.project.id, false))) }
                    : { label: t("project.archive"), icon: <Archive />, onSelect: () => start(async () => void (await setArchivedAction(slug, data.project.id, true))) },
                  "separator",
                  { label: t("project.trash"), icon: <Trash2 />, destructive: true, onSelect: () => setDialog({ kind: "trash" }) },
                ]
              : undefined
          }
        />
      </PageHeader>

      {data.project.archived && (
        <Alert variant="attention" actions={canManage ? <Button size="sm" variant="outline" onClick={() => start(async () => void (await setArchivedAction(slug, data.project.id, false)))}>{t("project.restore")}</Button> : undefined}>
          {t("project.archivedBanner")}
        </Alert>
      )}
      {!data.project.archived && !atLeast(data.level, "edit") && <Alert variant="info">{t("project.viewOnly")}</Alert>}

      <div role="tablist" aria-label={data.project.name} className="flex items-center gap-5 border-b border-default">
        {tab("daftar", t("project.tab.list"))}
        {tab("papan", t("project.tab.board"))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {data.boards.map((b) => (
          <Link
            key={b.id}
            href={`${base}/${view}?papan=${b.id}`}
            aria-current={b.id === data.board.id ? "page" : undefined}
            className="rounded-md px-2.5 py-1 text-sm text-subtle hover:bg-subtle focus-ring aria-[current=page]:bg-subtle aria-[current=page]:font-medium aria-[current=page]:text-emphasis"
          >
            {b.name}
          </Link>
        ))}
        {canEdit && <IconButton size="xs" label={t("project.newBoard")} icon={<Plus />} onClick={() => (setName(""), setError(null), setDialog({ kind: "board" }))} />}
        <div className="ml-auto w-64">
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger aria-label={t("task.assignee")}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("project.allAssignees")}</SelectItem>
              <SelectItem value="none">{t("task.none")}</SelectItem>
              {data.assignees.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {view === "papan" ? (
        <Board
          t={t}
          locale={locale}
          today={today}
          columns={data.columns}
          tasks={tasks}
          readOnly={!canEdit}
          onMove={move}
          onOpen={openModal}
          onAdd={(columnId) => setDialog({ kind: "task", columnId })}
          onColumnMenu={columnMenu}
          trailing={
            canEdit ? (
              <Button variant="ghost" className="w-56 shrink-0 justify-start text-subtle" onClick={() => (setName(""), setError(null), setDialog({ kind: "column" }))}>
                <Plus aria-hidden />
                {t("project.newColumn")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <TaskListView t={t} locale={locale} today={today} columns={data.columns} tasks={tasks} readOnly={!canEdit} onOpen={openModal} onQuickAdd={quickAdd} />
      )}

      {dialog?.kind === "task" && (
        <NewTaskDialog t={t} slug={slug} projectId={data.project.id} boardId={data.board.id} columns={data.columns} assignees={data.assignees} columnId={dialog.columnId} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === "board" &&
        nameDialog(t("project.newBoard"), t("project.boardName"), async () => {
          const r = await createBoardAction(slug, data.project.id, name);
          if (r.ok) router.push(`${base}/${view}?papan=${r.id}`);
          return r.ok ? { ok: true } : { ok: false, error: r.error };
        })}
      {dialog?.kind === "column" &&
        nameDialog(
          t("project.newColumn"),
          t("project.columnName"),
          async () => {
            const r = await createColumnAction(slug, data.board.id, name, category);
            return r.ok ? { ok: true } : { ok: false, error: r.error };
          },
          <FormField label={t("project.category")}>
            <Select value={category} onValueChange={(v) => setCategory(v as ColumnCategory)}>
              <FormControl>
                <SelectTrigger><SelectValue /></SelectTrigger>
              </FormControl>
              <SelectContent>
                {(["todo", "in_progress", "done"] as const).map((c) => <SelectItem key={c} value={c}>{t(`project.category.${c}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>,
        )}
      {dialog?.kind === "rename" &&
        nameDialog(t("team.rename"), t("project.columnName"), async () => {
          const r = await renameColumnAction(slug, dialog.column.id, name);
          return r.ok ? { ok: true } : { ok: false, error: r.error };
        })}
      <ConfirmDialog
        open={dialog?.kind === "trash"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={t("project.trashConfirm", data.project.name)}
        description={t("project.trashBody")}
        confirmLabel={t("project.trash")}
        cancelLabel={t("common.cancel")}
        loading={pending}
        onConfirm={() =>
          start(async () => {
            const r = await deleteProjectAction(slug, data.project.id);
            if (!r.ok) return void toast.error(t(r.error));
            router.push(`/${slug}/s/${data.project.spaceId}`);
          })
        }
      />
      {taskId && <TaskModal t={t} locale={locale} slug={slug} taskId={taskId} projectName={data.project.name} assignees={data.assignees} onClose={() => openModal(null)} />}
    </div>
  );
}
