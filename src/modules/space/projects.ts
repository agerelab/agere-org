// Projects, boards and columns (PRD-06 §6.1, §5, US-1, US-16).
import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";
import { getDb, type Tx } from "@/db/client";
import { uuidv7 } from "@/lib/ids";
import type { RequestContext } from "@/lib/context";
import { translator, type Locale } from "@/i18n";
import { publish } from "@/modules/events";
import { upsertAclRow } from "@/modules/authz/repository";
import type { ColumnCategory } from "@/db/schema";
import { checkProject, checkSpace } from "./access";
import * as repo from "./repository";
import { denied, orgCtx, type Fail } from "./shared";

export const LIMITS = { boardsPerProject: 20, columnsPerBoard: 20 };

/** A new board has 3 columns (§6.1), named in the organization's default language. */
async function insertBoardWithColumns(tx: Tx, organizationId: string, projectId: string, name: string, orderKey: string, locale: Locale) {
  const t = translator(locale);
  const boardId = uuidv7();
  await repo.insertBoard(tx, { organizationId, id: boardId, projectId, name, orderKey });
  const keys = generateNKeysBetween(null, null, 3);
  const cats: [ColumnCategory, Parameters<typeof t>[0]][] = [
    ["todo", "space.column.todo"],
    ["in_progress", "space.column.inProgress"],
    ["done", "space.column.done"],
  ];
  await repo.insertColumns(tx, cats.map(([category, key], i) => ({ organizationId, id: uuidv7(), boardId, name: t(key), category, orderKey: keys[i] })));
  return boardId;
}

/**
 * US-1: a project gets a default board with 3 columns; the creator manages it; it follows its
 * space's access (inherit) unless restricted later through Bagikan. Needs edit on the space.
 */
export async function createProject(
  ctx: RequestContext,
  spaceId: string,
  input: { name: string; description?: string },
  locale: Locale,
): Promise<{ ok: true; id: string; boardId: string; eventIds: string[] } | Fail<"INVALID" | "NOT_FOUND" | "FORBIDDEN" | "NO_APP_ACCESS">> {
  const name = input.name.trim();
  if (name.length < 1 || name.length > 80 || (input.description ?? "").length > 2000) return { ok: false, code: "INVALID" };
  const db = getDb();
  if (!(await repo.space(db, ctx.organizationId, spaceId))) return { ok: false, code: "NOT_FOUND" };
  const d = await checkSpace(ctx, "edit", spaceId);
  if (!d.allow) return { ok: false, code: denied(d.reason) };
  const id = uuidv7();
  const t = translator(locale);
  const result = await db.transaction(async (tx) => {
    await repo.insertProject(tx, { organizationId: ctx.organizationId, id, spaceId, name, description: (input.description ?? "").trim(), createdBy: ctx.userId, ownerUserId: ctx.userId });
    await upsertAclRow(tx, ctx.organizationId, { type: "space.project", id }, { type: "user", id: ctx.userId }, "manage");
    const boardId = await insertBoardWithColumns(tx, ctx.organizationId, id, t("space.board.default"), generateKeyBetween(null, null), locale);
    const eventId = await publish(tx, orgCtx(ctx), { type: "space.project.created", subject: { module: "space", type: "project", id, container: { type: "space", id: spaceId } }, data: { name } });
    return { boardId, eventId };
  });
  return { ok: true, id, boardId: result.boardId, eventIds: [result.eventId] };
}

async function requireProject(ctx: RequestContext, id: string, need: "view" | "edit" | "manage") {
  const p = await repo.project(getDb(), ctx.organizationId, id);
  if (!p) return { ok: false as const, code: "NOT_FOUND" as const };
  const d = await checkProject(ctx, need, p);
  if (!d.allow) return { ok: false as const, code: denied(d.reason) };
  return { ok: true as const, project: p, level: d.level, override: d.override };
}

export async function updateProject(ctx: RequestContext, id: string, input: { name: string; description: string }): Promise<{ ok: true; eventIds: string[] } | Fail<"INVALID" | "NOT_FOUND" | "FORBIDDEN" | "NO_APP_ACCESS">> {
  const name = input.name.trim();
  if (name.length < 1 || name.length > 80 || input.description.length > 2000) return { ok: false, code: "INVALID" };
  const r = await requireProject(ctx, id, "edit");
  if (!r.ok) return r;
  const eventId = await getDb().transaction(async (tx) => {
    await repo.updateProject(tx, ctx.organizationId, id, { name, description: input.description.trim() });
    return publish(tx, orgCtx(ctx), {
      type: "space.project.updated",
      subject: { module: "space", type: "project", id, container: { type: "space", id: r.project.spaceId } },
      before: { name: r.project.name },
      after: { name },
    });
  });
  return { ok: true, eventIds: [eventId] };
}

/** Archive (read-only, hidden) and restore: manage. */
export async function setArchived(ctx: RequestContext, id: string, archived: boolean): Promise<{ ok: true; eventIds: string[] } | Fail<"NOT_FOUND" | "FORBIDDEN" | "NO_APP_ACCESS">> {
  const r = await requireProject(ctx, id, "manage");
  if (!r.ok) return r;
  const eventId = await getDb().transaction(async (tx) => {
    await repo.updateProject(tx, ctx.organizationId, id, { archivedAt: archived ? new Date() : null });
    return publish(tx, orgCtx(ctx), { type: archived ? "space.project.archived" : "space.project.restored", subject: { module: "space", type: "project", id, container: { type: "space", id: r.project.spaceId } } });
  });
  return { ok: true, eventIds: [eventId] };
}

/** Delete to Sampah (manage; PRD-13 purges after 30 days). */
export async function deleteProject(ctx: RequestContext, id: string): Promise<{ ok: true; spaceId: string; eventIds: string[] } | Fail<"NOT_FOUND" | "FORBIDDEN" | "NO_APP_ACCESS">> {
  const r = await requireProject(ctx, id, "manage");
  if (!r.ok) return r;
  const eventId = await getDb().transaction(async (tx) => {
    await repo.updateProject(tx, ctx.organizationId, id, { deletedAt: new Date() });
    return publish(tx, orgCtx(ctx), { type: "space.project.deleted", subject: { module: "space", type: "project", id, container: { type: "space", id: r.project.spaceId } }, data: { name: r.project.name } });
  });
  return { ok: true, spaceId: r.project.spaceId, eventIds: [eventId] };
}

export async function setFavorite(ctx: RequestContext, projectId: string, on: boolean): Promise<{ ok: true; eventIds: string[] } | Fail<"NOT_FOUND" | "FORBIDDEN" | "NO_APP_ACCESS">> {
  const r = await requireProject(ctx, projectId, "view");
  if (!r.ok) return r;
  await repo.setFavorite(getDb(), ctx.organizationId, ctx.userId, projectId, on);
  return { ok: true, eventIds: [] };
}

// ---------- boards ----------

export async function createBoard(ctx: RequestContext, projectId: string, name: string, locale: Locale): Promise<{ ok: true; id: string; eventIds: string[] } | Fail<"INVALID" | "LIMIT" | "NOT_FOUND" | "FORBIDDEN" | "NO_APP_ACCESS">> {
  if (!name.trim() || name.trim().length > 60) return { ok: false, code: "INVALID" };
  const r = await requireProject(ctx, projectId, "edit");
  if (!r.ok) return r;
  const db = getDb();
  const existing = await repo.boardsOf(db, ctx.organizationId, projectId);
  if (existing.length >= LIMITS.boardsPerProject) return { ok: false, code: "LIMIT" };
  const id = await db.transaction((tx) => insertBoardWithColumns(tx, ctx.organizationId, projectId, name.trim(), generateKeyBetween(existing.at(-1)?.orderKey ?? null, null), locale));
  return { ok: true, id, eventIds: [] };
}

export async function renameBoard(ctx: RequestContext, boardId: string, name: string): Promise<{ ok: true; eventIds: string[] } | Fail<"INVALID" | "NOT_FOUND" | "FORBIDDEN" | "NO_APP_ACCESS">> {
  if (!name.trim() || name.trim().length > 60) return { ok: false, code: "INVALID" };
  const b = await repo.board(getDb(), ctx.organizationId, boardId);
  if (!b) return { ok: false, code: "NOT_FOUND" };
  const r = await requireProject(ctx, b.projectId, "edit");
  if (!r.ok) return r;
  await repo.renameBoard(getDb(), ctx.organizationId, boardId, name.trim());
  return { ok: true, eventIds: [] };
}

/** A board is deleted with its columns only when it holds no tasks and is not the last one. */
export async function deleteBoard(ctx: RequestContext, boardId: string): Promise<{ ok: true; eventIds: string[] } | Fail<"NOT_FOUND" | "FORBIDDEN" | "NO_APP_ACCESS" | "LAST_BOARD" | "NOT_EMPTY">> {
  const db = getDb();
  const b = await repo.board(db, ctx.organizationId, boardId);
  if (!b) return { ok: false, code: "NOT_FOUND" };
  const r = await requireProject(ctx, b.projectId, "manage");
  if (!r.ok) return r;
  if ((await repo.boardsOf(db, ctx.organizationId, b.projectId)).length <= 1) return { ok: false, code: "LAST_BOARD" };
  if ((await repo.tasksOfBoard(db, ctx.organizationId, boardId)).length) return { ok: false, code: "NOT_EMPTY" };
  await repo.deleteBoard(db, ctx.organizationId, boardId);
  return { ok: true, eventIds: [] };
}

// ---------- columns ----------

export async function createColumn(ctx: RequestContext, boardId: string, name: string, category: ColumnCategory): Promise<{ ok: true; id: string; eventIds: string[] } | Fail<"INVALID" | "LIMIT" | "NOT_FOUND" | "FORBIDDEN" | "NO_APP_ACCESS">> {
  if (!name.trim() || name.trim().length > 40) return { ok: false, code: "INVALID" };
  const db = getDb();
  const b = await repo.board(db, ctx.organizationId, boardId);
  if (!b) return { ok: false, code: "NOT_FOUND" };
  const r = await requireProject(ctx, b.projectId, "edit");
  if (!r.ok) return r;
  const cols = await repo.columnsOf(db, ctx.organizationId, boardId);
  if (cols.length >= LIMITS.columnsPerBoard) return { ok: false, code: "LIMIT" };
  const id = uuidv7();
  await repo.insertColumns(db, [{ organizationId: ctx.organizationId, id, boardId, name: name.trim(), category, orderKey: generateKeyBetween(cols.at(-1)?.orderKey ?? null, null) }]);
  return { ok: true, id, eventIds: [] };
}

export async function updateColumn(ctx: RequestContext, columnId: string, input: { name: string; category: ColumnCategory }): Promise<{ ok: true; eventIds: string[] } | Fail<"INVALID" | "NOT_FOUND" | "FORBIDDEN" | "NO_APP_ACCESS">> {
  if (!input.name.trim() || input.name.trim().length > 40) return { ok: false, code: "INVALID" };
  const db = getDb();
  const c = await repo.column(db, ctx.organizationId, columnId);
  if (!c) return { ok: false, code: "NOT_FOUND" };
  const b = (await repo.board(db, ctx.organizationId, c.boardId))!;
  const r = await requireProject(ctx, b.projectId, "edit");
  if (!r.ok) return r;
  await repo.updateColumn(db, ctx.organizationId, columnId, { name: input.name.trim(), category: input.category });
  return { ok: true, eventIds: [] };
}

/** Moves a column to sit before `beforeId` (null = last). */
export async function moveColumn(ctx: RequestContext, columnId: string, beforeId: string | null): Promise<{ ok: true; eventIds: string[] } | Fail<"NOT_FOUND" | "FORBIDDEN" | "NO_APP_ACCESS">> {
  const db = getDb();
  const c = await repo.column(db, ctx.organizationId, columnId);
  if (!c) return { ok: false, code: "NOT_FOUND" };
  const b = (await repo.board(db, ctx.organizationId, c.boardId))!;
  const r = await requireProject(ctx, b.projectId, "edit");
  if (!r.ok) return r;
  const others = (await repo.columnsOf(db, ctx.organizationId, c.boardId)).filter((x) => x.id !== columnId);
  const i = beforeId ? others.findIndex((x) => x.id === beforeId) : others.length;
  const at = i < 0 ? others.length : i;
  await repo.updateColumn(db, ctx.organizationId, columnId, { orderKey: generateKeyBetween(others[at - 1]?.orderKey ?? null, others[at]?.orderKey ?? null) });
  return { ok: true, eventIds: [] };
}

/** §10: a column with tasks cannot be deleted ("Pindahkan tugas di kolom ini dulu."). */
export async function deleteColumn(ctx: RequestContext, columnId: string): Promise<{ ok: true; eventIds: string[] } | Fail<"NOT_FOUND" | "FORBIDDEN" | "NO_APP_ACCESS" | "NOT_EMPTY" | "LAST_COLUMN">> {
  const db = getDb();
  const c = await repo.column(db, ctx.organizationId, columnId);
  if (!c) return { ok: false, code: "NOT_FOUND" };
  const b = (await repo.board(db, ctx.organizationId, c.boardId))!;
  const r = await requireProject(ctx, b.projectId, "edit");
  if (!r.ok) return r;
  if (await repo.tasksInColumn(db, ctx.organizationId, columnId)) return { ok: false, code: "NOT_EMPTY" };
  if ((await repo.columnsOf(db, ctx.organizationId, c.boardId)).length <= 1) return { ok: false, code: "LAST_COLUMN" };
  await repo.deleteColumn(db, ctx.organizationId, columnId);
  return { ok: true, eventIds: [] };
}

export { requireProject };
