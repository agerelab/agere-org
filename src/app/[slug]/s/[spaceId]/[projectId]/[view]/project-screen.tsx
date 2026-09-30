"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, ChevronLeft, Flag, Link2, Lock, MoreHorizontal, Pencil, Plus, Share2, Star, Trash2, Users } from "lucide-react";
import { AvatarGroup } from "@/components/ui/avatar";
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
import type { MemberRow, ProjectHeader, ProjectKpis, projectBoard } from "@/modules/space/queries";
import { Board, type BoardColumn, type BoardTask, type Move } from "@/ui/space/board";
import { initials } from "@/ui/space/icons";
import { TaskListView } from "@/ui/space/list";
import { NewTaskDialog } from "@/ui/space/new-task-dialog";
import { rememberView } from "@/ui/space/project-landing";
import { TaskModal } from "@/ui/space/task-modal";
import { ProjectMembers } from "@/ui/space/project-members";
import { StatusChip, StatusDialog } from "@/ui/space/project-status";
import { ProjectSummary } from "@/ui/space/project-summary";
import { ShareDialog } from "@/ui/space/share-dialog";
import {
  createBoardAction,
  createColumnAction,
  createTaskAction,
  deleteColumnAction,
  deleteProjectAction,
  moveTaskAction,
  renameColumnAction,
  setArchivedAction,
  setFavoriteAction,
  updateTaskAction,
} from "../../../actions";

type Data = Awaited<ReturnType<typeof projectBoard>>;
export type ProjectView = "daftar" | "papan" | "ringkasan" | "anggota";
type Props = {
  slug: string;
  orgName: string;
  locale: Locale;
  view: ProjectView;
  spaceName: string;
  data: Data;
  header: ProjectHeader;
  description: string;
  kpis?: ProjectKpis;
  members?: { rows: MemberRow[]; open: number; unassigned: number; overdue: number };
  override: boolean;
  today: string;
  openTask: string | null;
};
type Dialogs = { kind: "task"; columnId?: string } | { kind: "board" } | { kind: "column" } | { kind: "rename"; column: BoardColumn } | { kind: "trash" } | { kind: "share" } | { kind: "status" } | null;
const VIEWS: ProjectView[] = ["daftar", "papan", "ringkasan", "anggota"];
// A tab opened with the keyboard keeps focus across the navigation (the page remounts).
const FOCUS_TAB = "agere:focus-tab";

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

export function ProjectScreen({ slug, orgName, locale, view, spaceName, data, header, description, kpis, members, override, today, openTask }: Props) {
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
  const [favorite, setFavorite] = React.useOptimistic(header.favorite);
  const boardView = view === "daftar" || view === "papan";

  React.useEffect(() => rememberView(data.project.id, view), [data.project.id, view]);
  React.useEffect(() => {
    try {
      if (sessionStorage.getItem(FOCUS_TAB) !== view) return;
      sessionStorage.removeItem(FOCUS_TAB);
    } catch {
      return;
    }
    document.getElementById(`tab-${view}`)?.focus();
  }, [view]);

  const toggleFavorite = () =>
    start(async () => {
      setFavorite(!favorite);
      const r = await setFavoriteAction(slug, data.project.id, !favorite);
      if (!r.ok) toast.error(t(r.error));
    });

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${base}`);
      toast.success(t("share.copied"));
    } catch {
      toast.error(t("share.copyFailed"));
    }
  };

  const rename = async (task: BoardTask, title: string) => {
    const r = await updateTaskAction(slug, task.id, task.version, { title });
    if (!r.ok) toast.error(t(r.error), r.conflict ? { action: { label: t("project.reload"), onClick: () => router.refresh() } } : undefined);
    return r.ok;
  };

  // ARIA tabs with automatic activation (US-10): ←/→ and Home/End move to and open the next view.
  const onTabKey = (e: React.KeyboardEvent) => {
    const i = VIEWS.indexOf(view);
    const next = e.key === "ArrowRight" ? VIEWS[(i + 1) % VIEWS.length] : e.key === "ArrowLeft" ? VIEWS[(i - 1 + VIEWS.length) % VIEWS.length] : e.key === "Home" ? VIEWS[0] : e.key === "End" ? VIEWS.at(-1)! : null;
    if (!next) return;
    e.preventDefault();
    document.getElementById(`tab-${next}`)?.focus();
    try {
      sessionStorage.setItem(FOCUS_TAB, next);
    } catch {}
    router.push(href(next));
  };
  const href = (v: ProjectView) => `${base}/${v}${data.boards.length > 1 && (v === "daftar" || v === "papan") ? `?papan=${data.board.id}` : ""}`;

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

  const tab = (v: ProjectView, label: string, count?: number) => (
    <Link
      id={`tab-${v}`}
      href={href(v)}
      role="tab"
      aria-selected={view === v}
      tabIndex={view === v ? 0 : -1}
      className={cn("inline-flex h-10 items-center gap-1.5 border-b-2 px-1 text-sm font-medium focus-ring", view === v ? "border-foreground text-emphasis" : "border-transparent text-subtle hover:text-emphasis")}
    >
      {label}
      {count !== undefined && <span className="rounded-full bg-subtle px-1.5 text-xs tabular-nums text-subtle">{count}</span>}
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
                <IconButton
                  size="xs"
                  variant="ghost"
                  label={t(favorite ? "favorite.remove" : "favorite.add", data.project.name)}
                  aria-pressed={favorite}
                  icon={<Star className={cn(favorite && "fill-current text-attention-on-surface")} />}
                  onClick={toggleFavorite}
                />
                <StatusChip t={t} locale={locale} status={header.status} targetDate={header.targetDate} onClick={canManage ? () => setDialog({ kind: "status" }) : undefined} />
                {header.access === "restricted" ? (
                  <Badge variant="secondary" startIcon={<Lock />} title={t("project.accessRestrictedHint")}>{t("space.restricted")}</Badge>
                ) : (
                  <Badge variant="outline" startIcon={<Users />} title={t(header.access === "everyone" ? "project.accessEveryoneHint" : "project.accessSpaceHint")}>
                    {t(header.access === "everyone" ? "space.everyone" : "project.followsSpace")}
                  </Badge>
                )}
                {override && <Badge variant="attention">{t("project.adminAccess")}</Badge>}
              </>
            }
          >
            {data.project.name}
          </PageHeaderTitle>
          {description && <PageHeaderDescription>{description}</PageHeaderDescription>}
        </PageHeaderContent>
        <PageHeaderActions
          leading={
            <button type="button" onClick={() => setDialog({ kind: "share" })} aria-label={t("share.peopleCount", String(header.people.length))} className="rounded-full focus-ring">
              <AvatarGroup aria-hidden people={header.people} max={4} size="sm" />
            </button>
          }
          secondary={[{ label: t("share.button"), icon: <Share2 />, onSelect: () => setDialog({ kind: "share" }) }]}
          primary={canEdit ? { label: t("task.new"), icon: <Plus />, onSelect: () => setDialog({ kind: "task" }) } : undefined}
          menuLabel={t("people.actions", data.project.name)}
          menu={[
            ...(canManage ? [{ label: t("status.title"), icon: <Flag />, onSelect: () => setDialog({ kind: "status" }) }] : []),
            { label: t("project.copyLink"), icon: <Link2 />, onSelect: copyLink },
            ...(canManage
              ? [
                  "separator" as const,
                  data.project.archived
                    ? { label: t("project.restore"), icon: <ArchiveRestore />, onSelect: () => start(async () => void (await setArchivedAction(slug, data.project.id, false))) }
                    : { label: t("project.archive"), icon: <Archive />, onSelect: () => start(async () => void (await setArchivedAction(slug, data.project.id, true))) },
                  { label: t("project.trash"), icon: <Trash2 />, destructive: true, onSelect: () => setDialog({ kind: "trash" }) },
                ]
              : []),
          ]}
        />
      </PageHeader>

      {data.project.archived && (
        <Alert variant="attention" actions={canManage ? <Button size="sm" variant="outline" onClick={() => start(async () => void (await setArchivedAction(slug, data.project.id, false)))}>{t("project.restore")}</Button> : undefined}>
          {t("project.archivedBanner")}
        </Alert>
      )}
      {!data.project.archived && !atLeast(data.level, "edit") && <Alert variant="info">{t("project.viewOnly")}</Alert>}

      <div role="tablist" aria-label={data.project.name} onKeyDown={onTabKey} className="flex items-center gap-5 overflow-x-auto border-b border-default">
        {tab("daftar", t("project.tab.list"), openCount)}
        {tab("papan", t("project.tab.board"), openCount)}
        {tab("ringkasan", t("project.tab.summary"))}
        {tab("anggota", t("project.tab.members"), header.people.length)}
      </div>

      {view === "ringkasan" && kpis && (
        <ProjectSummary t={t} locale={locale} description={description} header={header} kpis={kpis} onStatus={canManage ? () => setDialog({ kind: "status" }) : undefined} onShare={() => setDialog({ kind: "share" })} />
      )}
      {view === "anggota" && members && <ProjectMembers t={t} locale={locale} data={members} />}

      {boardView && (
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

      )}

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
      ) : view === "daftar" ? (
        <TaskListView t={t} slug={slug} locale={locale} today={today} columns={data.columns} tasks={tasks} assignees={data.assignees} readOnly={!canEdit} onOpen={openModal} onQuickAdd={quickAdd} onRename={rename} />
      ) : null}

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
      {dialog?.kind === "share" && (
        <ShareDialog
          t={t}
          slug={slug}
          orgName={orgName}
          target={{ kind: "project", id: data.project.id }}
          subtitle={t("share.subtitleView", data.project.name, t(`project.tab.${view === "daftar" ? "list" : view === "papan" ? "board" : view === "ringkasan" ? "summary" : "members"}`))}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "status" && (
        <StatusDialog
          t={t}
          slug={slug}
          projectId={data.project.id}
          initial={{ status: header.status, targetDate: header.targetDate, note: header.statusNote ?? "", ownerUserId: header.owner?.id ?? null }}
          people={data.assignees.filter((a) => a.type === "user").map((a) => ({ id: a.id, name: a.name }))}
          onClose={() => setDialog(null)}
        />
      )}
      {taskId && <TaskModal t={t} locale={locale} slug={slug} taskId={taskId} projectName={data.project.name} assignees={data.assignees} onClose={() => openModal(null)} />}
    </div>
  );
}
