// Space tables (PRD-06 §6.1). Every query names the organization.
import { and, asc, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { boardColumns, boards, projectFavorites, projects, spaces, taskComments, tasks, teamMembers, users } from "@/db/schema";
import type { Db, Tx } from "@/db/client";

type Q = Db | Tx;
export type SpaceRow = typeof spaces.$inferSelect;
export type ProjectRow = typeof projects.$inferSelect;
export type BoardRow = typeof boards.$inferSelect;
export type ColumnRow = typeof boardColumns.$inferSelect;
export type TaskRow = typeof tasks.$inferSelect;

// ---------- spaces ----------
export const liveSpaces = (q: Q, orgId: string) =>
  q.select().from(spaces).where(and(eq(spaces.organizationId, orgId), isNull(spaces.deletedAt))).orderBy(asc(spaces.name));

export async function space(q: Q, orgId: string, id: string) {
  const [row] = await q.select().from(spaces).where(and(eq(spaces.organizationId, orgId), eq(spaces.id, id), isNull(spaces.deletedAt)));
  return row;
}

export async function spaceByName(q: Q, orgId: string, name: string) {
  const [row] = await q.select().from(spaces).where(and(eq(spaces.organizationId, orgId), isNull(spaces.deletedAt), sql`lower(${spaces.name}) = lower(${name})`));
  return row;
}

export async function insertSpace(q: Q, row: typeof spaces.$inferInsert) {
  await q.insert(spaces).values(row);
}

export async function updateSpace(q: Q, orgId: string, id: string, set: Partial<typeof spaces.$inferInsert>) {
  await q.update(spaces).set({ ...set, updatedAt: new Date(), version: sql`${spaces.version} + 1` }).where(and(eq(spaces.organizationId, orgId), eq(spaces.id, id)));
}

// ---------- projects ----------
export const liveProjects = (q: Q, orgId: string) =>
  q.select().from(projects).where(and(eq(projects.organizationId, orgId), isNull(projects.deletedAt))).orderBy(asc(projects.name));

export async function project(q: Q, orgId: string, id: string) {
  const [row] = await q.select().from(projects).where(and(eq(projects.organizationId, orgId), eq(projects.id, id), isNull(projects.deletedAt)));
  return row;
}

export async function projectCount(q: Q, orgId: string, spaceId: string) {
  const [row] = await q.select({ n: count() }).from(projects).where(and(eq(projects.organizationId, orgId), eq(projects.spaceId, spaceId), isNull(projects.deletedAt)));
  return row?.n ?? 0;
}

export async function insertProject(q: Q, row: typeof projects.$inferInsert) {
  await q.insert(projects).values(row);
}

export async function updateProject(q: Q, orgId: string, id: string, set: Partial<typeof projects.$inferInsert>) {
  await q.update(projects).set({ ...set, updatedAt: new Date(), version: sql`${projects.version} + 1` }).where(and(eq(projects.organizationId, orgId), eq(projects.id, id)));
}

export async function favorites(q: Q, orgId: string, userId: string): Promise<string[]> {
  const rows = await q.select({ id: projectFavorites.projectId }).from(projectFavorites).where(and(eq(projectFavorites.organizationId, orgId), eq(projectFavorites.userId, userId)));
  return rows.map((r) => r.id);
}

export async function setFavorite(q: Q, orgId: string, userId: string, projectId: string, on: boolean) {
  if (on) await q.insert(projectFavorites).values({ organizationId: orgId, userId, projectId }).onConflictDoNothing();
  else await q.delete(projectFavorites).where(and(eq(projectFavorites.organizationId, orgId), eq(projectFavorites.userId, userId), eq(projectFavorites.projectId, projectId)));
}

/** Open / done / overdue counts of top-level tasks per project (§6.13), for cards. */
export async function projectTaskStats(q: Q, orgId: string, projectIds: string[], today: string) {
  if (!projectIds.length) return [];
  return q
    .select({
      projectId: tasks.projectId,
      total: count(),
      done: sql<number>`count(*) filter (where ${boardColumns.category} = 'done')::int`,
      overdue: sql<number>`count(*) filter (where ${boardColumns.category} <> 'done' and ${tasks.dueDate} < ${today})::int`,
    })
    .from(tasks)
    .innerJoin(boardColumns, and(eq(boardColumns.organizationId, tasks.organizationId), eq(boardColumns.id, tasks.columnId)))
    .where(and(eq(tasks.organizationId, orgId), inArray(tasks.projectId, projectIds), isNull(tasks.deletedAt), isNull(tasks.parentTaskId)))
    .groupBy(tasks.projectId);
}

// ---------- boards and columns ----------
export const boardsOf = (q: Q, orgId: string, projectId: string) =>
  q.select().from(boards).where(and(eq(boards.organizationId, orgId), eq(boards.projectId, projectId))).orderBy(asc(boards.orderKey));

export async function board(q: Q, orgId: string, id: string) {
  const [row] = await q.select().from(boards).where(and(eq(boards.organizationId, orgId), eq(boards.id, id)));
  return row;
}

export async function insertBoard(q: Q, row: typeof boards.$inferInsert) {
  await q.insert(boards).values(row);
}

export async function renameBoard(q: Q, orgId: string, id: string, name: string) {
  await q.update(boards).set({ name }).where(and(eq(boards.organizationId, orgId), eq(boards.id, id)));
}

export async function deleteBoard(q: Q, orgId: string, id: string) {
  await q.delete(boards).where(and(eq(boards.organizationId, orgId), eq(boards.id, id)));
}

export const columnsOf = (q: Q, orgId: string, boardId: string) =>
  q.select().from(boardColumns).where(and(eq(boardColumns.organizationId, orgId), eq(boardColumns.boardId, boardId))).orderBy(asc(boardColumns.orderKey));

export async function column(q: Q, orgId: string, id: string) {
  const [row] = await q.select().from(boardColumns).where(and(eq(boardColumns.organizationId, orgId), eq(boardColumns.id, id)));
  return row;
}

export async function insertColumns(q: Q, rows: (typeof boardColumns.$inferInsert)[]) {
  if (rows.length) await q.insert(boardColumns).values(rows);
}

export async function updateColumn(q: Q, orgId: string, id: string, set: Partial<typeof boardColumns.$inferInsert>) {
  await q.update(boardColumns).set(set).where(and(eq(boardColumns.organizationId, orgId), eq(boardColumns.id, id)));
}

export async function deleteColumn(q: Q, orgId: string, id: string) {
  await q.delete(boardColumns).where(and(eq(boardColumns.organizationId, orgId), eq(boardColumns.id, id)));
}

export async function tasksInColumn(q: Q, orgId: string, columnId: string) {
  const [row] = await q.select({ n: count() }).from(tasks).where(and(eq(tasks.organizationId, orgId), eq(tasks.columnId, columnId), isNull(tasks.deletedAt)));
  return row?.n ?? 0;
}

// ---------- tasks ----------
export async function task(q: Q, orgId: string, id: string) {
  const [row] = await q.select().from(tasks).where(and(eq(tasks.organizationId, orgId), eq(tasks.id, id), isNull(tasks.deletedAt)));
  return row;
}

export const tasksOfBoard = (q: Q, orgId: string, boardId: string) =>
  q
    .select()
    .from(tasks)
    .where(and(eq(tasks.organizationId, orgId), eq(tasks.boardId, boardId), isNull(tasks.deletedAt), isNull(tasks.parentTaskId)))
    .orderBy(asc(tasks.orderKey));

/** Neighbouring order keys in a column: the last one (append) or around a given task. */
export async function lastKeyInColumn(q: Q, orgId: string, columnId: string): Promise<string | null> {
  const [row] = await q
    .select({ k: tasks.orderKey })
    .from(tasks)
    .where(and(eq(tasks.organizationId, orgId), eq(tasks.columnId, columnId), isNull(tasks.deletedAt), isNull(tasks.parentTaskId)))
    .orderBy(desc(tasks.orderKey))
    .limit(1);
  return row?.k ?? null;
}

export async function orderedKeys(q: Q, orgId: string, columnId: string, excludeId: string): Promise<{ id: string; k: string }[]> {
  const rows = await q
    .select({ id: tasks.id, k: tasks.orderKey })
    .from(tasks)
    .where(and(eq(tasks.organizationId, orgId), eq(tasks.columnId, columnId), isNull(tasks.deletedAt), isNull(tasks.parentTaskId)))
    .orderBy(asc(tasks.orderKey));
  return rows.filter((r) => r.id !== excludeId);
}

export async function insertTask(q: Q, row: typeof tasks.$inferInsert) {
  await q.insert(tasks).values(row);
}

/** Optimistic concurrency (TECH-01 §5.2): 0 rows when the version moved on. */
export async function updateTaskVersioned(q: Q, orgId: string, id: string, version: number, set: Partial<typeof tasks.$inferInsert>) {
  return q
    .update(tasks)
    .set({ ...set, updatedAt: new Date(), version: sql`${tasks.version} + 1` })
    .where(and(eq(tasks.organizationId, orgId), eq(tasks.id, id), eq(tasks.version, version), isNull(tasks.deletedAt)))
    .returning();
}

/** Open (not done, not deleted) tasks assigned to one principal, for Work Ownership and Tugas saya. */
export async function openTasksAssignedTo(q: Q, orgId: string, type: "user" | "team", ids: string[]) {
  if (!ids.length) return [];
  return q
    .select({ task: tasks, category: boardColumns.category, project: projects })
    .from(tasks)
    .innerJoin(boardColumns, and(eq(boardColumns.organizationId, tasks.organizationId), eq(boardColumns.id, tasks.columnId)))
    .innerJoin(projects, and(eq(projects.organizationId, tasks.organizationId), eq(projects.id, tasks.projectId)))
    .where(
      and(
        eq(tasks.organizationId, orgId),
        eq(tasks.assigneeType, type),
        inArray(tasks.assigneeId, ids),
        isNull(tasks.deletedAt),
        isNull(projects.deletedAt),
        sql`${boardColumns.category} <> 'done'`,
      ),
    );
}

/** Tasks this user completed in the last 30 days (Tugas saya › Selesai). */
export async function recentlyDoneFor(q: Q, orgId: string, userId: string, teamIds: string[]) {
  const who = teamIds.length
    ? sql`((${tasks.assigneeType} = 'user' and ${tasks.assigneeId} = ${userId}) or (${tasks.assigneeType} = 'team' and ${inArray(tasks.assigneeId, teamIds)}))`
    : sql`(${tasks.assigneeType} = 'user' and ${tasks.assigneeId} = ${userId})`;
  return q
    .select({ task: tasks, category: boardColumns.category, project: projects })
    .from(tasks)
    .innerJoin(boardColumns, and(eq(boardColumns.organizationId, tasks.organizationId), eq(boardColumns.id, tasks.columnId)))
    .innerJoin(projects, and(eq(projects.organizationId, tasks.organizationId), eq(projects.id, tasks.projectId)))
    .where(and(eq(tasks.organizationId, orgId), who, isNull(tasks.deletedAt), isNull(projects.deletedAt), sql`${tasks.doneAt} > now() - interval '30 days'`, sql`${boardColumns.category} = 'done'`));
}

export async function reassignOpen(tx: Tx, orgId: string, fromType: "user" | "team", fromId: string, to: { type: "user"; id: string } | null) {
  const rows = await openTasksAssignedTo(tx, orgId, fromType, [fromId]);
  if (!rows.length) return [];
  const ids = rows.map((r) => r.task.id);
  await tx
    .update(tasks)
    .set({ assigneeType: to?.type ?? null, assigneeId: to?.id ?? null, updatedAt: new Date(), version: sql`${tasks.version} + 1` })
    .where(and(eq(tasks.organizationId, orgId), inArray(tasks.id, ids)));
  return rows;
}

// ---------- comments ----------
export async function insertComment(q: Q, row: typeof taskComments.$inferInsert) {
  await q.insert(taskComments).values(row);
}

export async function commentsOf(q: Q, orgId: string, taskId: string) {
  return q
    .select({ id: taskComments.id, body: taskComments.body, createdAt: taskComments.createdAt, authorId: taskComments.authorId, authorName: users.name })
    .from(taskComments)
    .innerJoin(users, eq(users.id, taskComments.authorId))
    .where(and(eq(taskComments.organizationId, orgId), eq(taskComments.taskId, taskId)))
    .orderBy(asc(taskComments.createdAt));
}

export async function teamIdsOf(q: Q, orgId: string, userId: string) {
  const rows = await q.select({ id: teamMembers.teamId }).from(teamMembers).where(and(eq(teamMembers.organizationId, orgId), eq(teamMembers.userId, userId)));
  return rows.map((r) => r.id);
}
