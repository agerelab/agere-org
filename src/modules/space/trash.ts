// Sampah for Space (PRD-06 US-7, US-15; PRD-13: 30 days, then purged). Anyone with manage on an item
// (Owner/Admin through the governance override) sees and restores it.
import { generateKeyBetween } from "fractional-indexing";
import { inArray } from "drizzle-orm";
import { getDb, type Db, type Tx } from "@/db/client";
import { users } from "@/db/schema";
import type { RequestContext } from "@/lib/context";
import { publish } from "@/modules/events";
import { appAccess, levelsFor } from "@/modules/authz/service";
import { atLeast } from "@/modules/authz/levels";
import { isAdminRole } from "@/modules/authz/matrix";
import { checkProject, checkSpace, projectChain, spaceChain } from "./access";
import * as repo from "./repository";
import { denied, orgCtx, type Fail } from "./shared";

export type TrashKind = "space" | "project" | "task";
export type TrashItem = { kind: TrashKind; id: string; name: string; where: string; deletedAt: string; deletedBy: string; purgeAt: string };

const purgeAt = (d: Date) => new Date(d.getTime() + repo.TRASH_DAYS * 86_400_000).toISOString();

/** Items in Sampah the viewer can manage, newest first. */
export async function trashList(ctx: RequestContext): Promise<TrashItem[]> {
  const db = getDb();
  if ((await appAccess(db, ctx, "space")) !== "ok") return [];
  const [spaces, projects, tasks, liveSpaces] = await Promise.all([
    repo.trashedSpaces(db, ctx.organizationId),
    repo.trashedProjects(db, ctx.organizationId),
    repo.trashedTasks(db, ctx.organizationId),
    repo.liveSpaces(db, ctx.organizationId),
  ]);
  const admin = isAdminRole(ctx.role);
  const canManage = async (chains: ReturnType<typeof spaceChain>[]) => (admin ? chains.map(() => true) : (await levelsFor(db, ctx, chains)).map((l) => atLeast(l, "manage")));
  const [sOk, pOk, tOk] = await Promise.all([
    canManage(spaces.map((s) => spaceChain(s.id))),
    canManage(projects.map((p) => projectChain(p))),
    canManage(tasks.map((t) => projectChain(t.project))),
  ]);
  const spaceName = new Map([...liveSpaces, ...spaces].map((s) => [s.id, s.name]));
  const who = [...new Set([...spaces, ...projects, ...tasks.map((t) => t.task)].map((x) => x.deletedBy).filter((x): x is string => !!x))];
  const names = new Map(who.length ? (await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, who))).map((u) => [u.id, u.name]) : []);
  const items: TrashItem[] = [
    ...spaces.filter((_, i) => sOk[i]).map((s) => ({ kind: "space" as const, id: s.id, name: s.name, where: "", deletedAt: s.deletedAt!.toISOString(), deletedBy: names.get(s.deletedBy ?? "") ?? "—", purgeAt: purgeAt(s.deletedAt!) })),
    ...projects.filter((_, i) => pOk[i]).map((p) => ({ kind: "project" as const, id: p.id, name: p.name, where: spaceName.get(p.spaceId) ?? "", deletedAt: p.deletedAt!.toISOString(), deletedBy: names.get(p.deletedBy ?? "") ?? "—", purgeAt: purgeAt(p.deletedAt!) })),
    ...tasks.filter((_, i) => tOk[i]).map(({ task: t, project: p }) => ({ kind: "task" as const, id: t.id, name: t.title, where: p.name, deletedAt: t.deletedAt!.toISOString(), deletedBy: names.get(t.deletedBy ?? "") ?? "—", purgeAt: purgeAt(t.deletedAt!) })),
  ];
  return items.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
}

type RestoreError = "NOT_FOUND" | "FORBIDDEN" | "NO_APP_ACCESS" | "TAKEN" | "PARENT_DELETED";

/**
 * Restores an item "ke tempat semula" (PRD-13 QA AD10). A task returns to its column and order; when
 * that column is gone it lands in the board's first todo column, at the end (US-7).
 */
export async function restore(ctx: RequestContext, kind: TrashKind, id: string): Promise<{ ok: true; name: string; eventIds: string[] } | Fail<RestoreError>> {
  const db = getDb();
  if (kind === "space") {
    const s = await repo.trashedSpace(db, ctx.organizationId, id);
    if (!s) return { ok: false, code: "NOT_FOUND" };
    const d = await checkSpace(ctx, "manage", id);
    if (!d.allow) return { ok: false, code: denied(d.reason) };
    if (await repo.spaceByName(db, ctx.organizationId, s.name)) return { ok: false, code: "TAKEN" };
    const eventId = await db.transaction(async (tx) => {
      await repo.updateSpace(tx, ctx.organizationId, id, { deletedAt: null, deletedBy: null });
      return publish(tx, orgCtx(ctx), { type: "space.space.restored", subject: { module: "space", type: "space", id } });
    });
    return { ok: true, name: s.name, eventIds: [eventId] };
  }
  if (kind === "project") {
    const p = await repo.trashedProject(db, ctx.organizationId, id);
    if (!p) return { ok: false, code: "NOT_FOUND" };
    if (!(await repo.space(db, ctx.organizationId, p.spaceId))) return { ok: false, code: "PARENT_DELETED" };
    const d = await checkProject(ctx, "manage", p);
    if (!d.allow) return { ok: false, code: denied(d.reason) };
    const eventId = await db.transaction(async (tx) => {
      await repo.updateProject(tx, ctx.organizationId, id, { deletedAt: null, deletedBy: null });
      return publish(tx, orgCtx(ctx), { type: "space.project.restored", subject: { module: "space", type: "project", id, container: { type: "space", id: p.spaceId } }, data: { from: "trash" } });
    });
    return { ok: true, name: p.name, eventIds: [eventId] };
  }
  const t = await repo.trashedTask(db, ctx.organizationId, id);
  if (!t) return { ok: false, code: "NOT_FOUND" };
  const p = await repo.project(db, ctx.organizationId, t.projectId);
  if (!p) return { ok: false, code: "PARENT_DELETED" };
  const d = await checkProject(ctx, "manage", p);
  if (!d.allow) return { ok: false, code: denied(d.reason) };
  const eventId = await db.transaction(async (tx) => {
    await repo.restoreTaskRow(tx, ctx.organizationId, id, await placement(tx, ctx.organizationId, t));
    return publish(tx, orgCtx(ctx), { type: "space.task.restored", subject: { module: "space", type: "task", id, container: { type: "project", id: t.projectId } } });
  });
  return { ok: true, name: t.title, eventIds: [eventId] };
}

/** Same column and order when possible; else the board's (or project's) first todo column, at the end. */
async function placement(q: Db | Tx, orgId: string, t: repo.TaskRow) {
  const column = await repo.column(q, orgId, t.columnId);
  if (column && !(await repo.keyTaken(q, orgId, column.id, t.orderKey))) return {};
  let target = column;
  let boardId = t.boardId;
  if (!target) {
    let cols = await repo.columnsOf(q, orgId, t.boardId);
    if (!cols.length) {
      boardId = (await repo.boardsOf(q, orgId, t.projectId))[0].id;
      cols = await repo.columnsOf(q, orgId, boardId);
    }
    target = cols.find((c) => c.category === "todo") ?? cols[0];
  }
  return {
    boardId,
    columnId: target.id,
    orderKey: generateKeyBetween(await repo.lastKeyInColumn(q, orgId, target.id), null),
    doneAt: target.category === "done" ? (t.doneAt ?? new Date()) : null,
  };
}

/** Cron (PRD-13 US-1): items deleted more than 30 days ago no longer exist. */
export async function purgeTrash() {
  return getDb().transaction((tx) => repo.purgeExpired(tx));
}
