// Tasks (PRD-06 §6.1–6.2, US-2, US-3, US-12). A task's status is its column; the column category
// drives completion. Edits carry `version` (optimistic concurrency, TECH-01 §5.2).
import { generateKeyBetween } from "fractional-indexing";
import { getDb, type Tx } from "@/db/client";
import { uuidv7 } from "@/lib/ids";
import type { RequestContext } from "@/lib/context";
import { publish } from "@/modules/events";
import { atLeast } from "@/modules/authz/levels";
import type { Priority } from "@/db/schema";
import { explicitLevel, memberCanView, type ProjectRef } from "./access";
import { requireProject } from "./projects";
import * as repo from "./repository";
import { isDate, orgCtx, type Fail } from "./shared";
import { teamMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const PRIORITIES: Priority[] = ["urgent", "high", "medium", "low"];
export type Assignee = { type: "user" | "team"; id: string } | null;
export type TaskPatch = { title?: string; description?: string; assignee?: Assignee; dueDate?: string | null; priority?: Priority | null };
type Err = "INVALID" | "NOT_FOUND" | "FORBIDDEN" | "NO_APP_ACCESS" | "VERSION_CONFLICT" | "ASSIGNEE_NO_ACCESS";

function validPatch(p: TaskPatch): boolean {
  if (p.title !== undefined && (p.title.trim().length < 1 || p.title.trim().length > 200)) return false;
  if (p.description !== undefined && p.description.length > 10_000) return false;
  if (p.dueDate && !isDate(p.dueDate)) return false;
  if (p.priority && !PRIORITIES.includes(p.priority)) return false;
  return true;
}

/**
 * US-12 / QA C9: a user assignee must be able to view the project; a team needs at least one active
 * member with an explicit grant (the governance override does not count).
 */
export async function assigneeAllowed(tx: Tx | ReturnType<typeof getDb>, organizationId: string, p: ProjectRef, a: Assignee): Promise<boolean> {
  if (!a) return true;
  if (a.type === "user") return memberCanView(tx, organizationId, a.id, p);
  const ids = await tx.select({ id: teamMembers.userId }).from(teamMembers).where(and(eq(teamMembers.organizationId, organizationId), eq(teamMembers.teamId, a.id)));
  for (const { id } of ids) if (atLeast(await explicitLevel(tx, organizationId, id, p), "view") && (await memberCanView(tx, organizationId, id, p))) return true;
  return false;
}

const subject = (t: { id: string; projectId: string }) => ({ module: "space", type: "task", id: t.id, container: { type: "project", id: t.projectId } });

async function publishAssigned(tx: Tx, ctx: RequestContext, t: { id: string; projectId: string }, a: Assignee) {
  // Assigning yourself notifies nobody (US-2); the consumer also skips the actor.
  if (!a || (a.type === "user" && a.id === ctx.userId)) return null;
  return publish(tx, orgCtx(ctx), { type: "space.task.assigned", subject: subject(t), data: { assignee_type: a.type, assignee_id: a.id, project_id: t.projectId } });
}

/** New task at the bottom of a column (default: the board's first todo column). */
export async function createTask(
  ctx: RequestContext,
  projectId: string,
  input: TaskPatch & { title: string; boardId?: string; columnId?: string },
): Promise<{ ok: true; id: string; eventIds: string[] } | Fail<Err>> {
  if (!validPatch(input)) return { ok: false, code: "INVALID" };
  const r = await requireProject(ctx, projectId, "edit");
  if (!r.ok) return r;
  if (r.project.archivedAt) return { ok: false, code: "FORBIDDEN" };
  const db = getDb();
  const boards = await repo.boardsOf(db, ctx.organizationId, projectId);
  const board = boards.find((b) => b.id === input.boardId) ?? boards[0];
  const columns = await repo.columnsOf(db, ctx.organizationId, board.id);
  const column = columns.find((c) => c.id === input.columnId) ?? columns.find((c) => c.category === "todo") ?? columns[0];
  if (!column) return { ok: false, code: "INVALID" };
  const assignee = input.assignee ?? null;
  if (!(await assigneeAllowed(db, ctx.organizationId, r.project, assignee))) return { ok: false, code: "ASSIGNEE_NO_ACCESS" };
  const id = uuidv7();
  const eventIds = await db.transaction(async (tx) => {
    await repo.insertTask(tx, {
      organizationId: ctx.organizationId,
      id,
      projectId,
      boardId: board.id,
      columnId: column.id,
      title: input.title.trim(),
      description: input.description ?? "",
      assigneeType: assignee?.type ?? null,
      assigneeId: assignee?.id ?? null,
      dueDate: input.dueDate ?? null,
      priority: input.priority ?? null,
      orderKey: generateKeyBetween(await repo.lastKeyInColumn(tx, ctx.organizationId, column.id), null),
      doneAt: column.category === "done" ? new Date() : null,
      createdBy: ctx.userId,
    });
    const t = { id, projectId };
    const ids = [await publish(tx, orgCtx(ctx), { type: "space.task.created", subject: subject(t), data: { column_id: column.id } })];
    const assigned = await publishAssigned(tx, ctx, t, assignee);
    if (assigned) ids.push(assigned);
    return ids;
  });
  return { ok: true, id, eventIds };
}

async function loadForEdit(ctx: RequestContext, id: string) {
  const t = await repo.task(getDb(), ctx.organizationId, id);
  if (!t) return { ok: false as const, code: "NOT_FOUND" as const };
  const r = await requireProject(ctx, t.projectId, "edit");
  if (!r.ok) return r;
  if (r.project.archivedAt) return { ok: false as const, code: "FORBIDDEN" as const };
  return { ok: true as const, task: t, project: r.project };
}

/** Field edits with a version check; a changed assignee publishes space.task.assigned. */
export async function updateTask(ctx: RequestContext, id: string, version: number, patch: TaskPatch): Promise<{ ok: true; version: number; eventIds: string[] } | Fail<Err>> {
  if (!validPatch(patch)) return { ok: false, code: "INVALID" };
  const l = await loadForEdit(ctx, id);
  if (!l.ok) return l;
  const db = getDb();
  const assigneeChanged = patch.assignee !== undefined && (patch.assignee?.id ?? null) !== l.task.assigneeId;
  if (assigneeChanged && !(await assigneeAllowed(db, ctx.organizationId, l.project, patch.assignee!))) return { ok: false, code: "ASSIGNEE_NO_ACCESS" };
  const set: Parameters<typeof repo.updateTaskVersioned>[4] = {};
  if (patch.title !== undefined) set.title = patch.title.trim();
  if (patch.description !== undefined) set.description = patch.description;
  if (patch.dueDate !== undefined) set.dueDate = patch.dueDate;
  if (patch.priority !== undefined) set.priority = patch.priority;
  if (patch.assignee !== undefined) {
    set.assigneeType = patch.assignee?.type ?? null;
    set.assigneeId = patch.assignee?.id ?? null;
  }
  const result = await db.transaction(async (tx) => {
    const rows = await repo.updateTaskVersioned(tx, ctx.organizationId, id, version, set);
    if (!rows.length) return null;
    const ids = [await publish(tx, orgCtx(ctx), { type: "space.task.updated", subject: subject(l.task), data: { fields: Object.keys(patch) } })];
    if (assigneeChanged) {
      const a = await publishAssigned(tx, ctx, l.task, patch.assignee!);
      if (a) ids.push(a);
    }
    return { version: rows[0].version, ids };
  });
  if (!result) return { ok: false, code: "VERSION_CONFLICT" };
  return { ok: true, version: result.version, eventIds: result.ids };
}

/**
 * US-3: move to a column at an index among the other tasks of that column. Writes only the moved
 * task (§6.2); done_at follows the column category.
 */
export async function moveTask(ctx: RequestContext, id: string, version: number, to: { columnId: string; index: number }): Promise<{ ok: true; version: number; eventIds: string[] } | Fail<Err>> {
  const l = await loadForEdit(ctx, id);
  if (!l.ok) return l;
  const db = getDb();
  const col = await repo.column(db, ctx.organizationId, to.columnId);
  if (!col || col.boardId !== l.task.boardId) return { ok: false, code: "INVALID" };
  const result = await db.transaction(async (tx) => {
    const others = await repo.orderedKeys(tx, ctx.organizationId, col.id, id);
    const at = Math.max(0, Math.min(to.index, others.length));
    const orderKey = generateKeyBetween(others[at - 1]?.k ?? null, others[at]?.k ?? null);
    const wasDone = !!l.task.doneAt;
    const isDone = col.category === "done";
    const rows = await repo.updateTaskVersioned(tx, ctx.organizationId, id, version, {
      columnId: col.id,
      orderKey,
      doneAt: isDone ? (wasDone ? l.task.doneAt : new Date()) : null,
    });
    if (!rows.length) return null;
    const eventId = await publish(tx, orgCtx(ctx), { type: "space.task.updated", subject: subject(l.task), data: { fields: ["column"], column_id: col.id } });
    return { version: rows[0].version, ids: [eventId] };
  });
  if (!result) return { ok: false, code: "VERSION_CONFLICT" };
  return { ok: true, version: result.version, eventIds: result.ids };
}

/** US-7: delete to Sampah (manage on the project); restorable for 30 days with its column and order. */
export async function deleteTask(ctx: RequestContext, id: string): Promise<{ ok: true; eventIds: string[] } | Fail<Err>> {
  const db = getDb();
  const t = await repo.task(db, ctx.organizationId, id);
  if (!t) return { ok: false, code: "NOT_FOUND" };
  const r = await requireProject(ctx, t.projectId, "manage");
  if (!r.ok) return r;
  const eventId = await db.transaction(async (tx) => {
    await repo.updateTaskVersioned(tx, ctx.organizationId, id, t.version, { deletedAt: new Date() });
    return publish(tx, orgCtx(ctx), { type: "space.task.deleted", subject: subject(t) });
  });
  return { ok: true, eventIds: [eventId] };
}

/** Comments (Should): edit on the project; sent immediately, not part of the unsaved task state. */
export async function addComment(ctx: RequestContext, taskId: string, body: string): Promise<{ ok: true; id: string; eventIds: string[] } | Fail<Err>> {
  const text = body.trim();
  if (!text || text.length > 5000) return { ok: false, code: "INVALID" };
  const l = await loadForEdit(ctx, taskId);
  if (!l.ok) return l;
  const id = uuidv7();
  const eventId = await getDb().transaction(async (tx) => {
    await repo.insertComment(tx, { organizationId: ctx.organizationId, id, taskId, authorId: ctx.userId, body: text });
    return publish(tx, orgCtx(ctx), { type: "space.comment.created", subject: subject(l.task), data: { comment_id: id } });
  });
  return { ok: true, id, eventIds: [eventId] };
}
