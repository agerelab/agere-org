// Read side of Space (TECH-01 §7 loaders). Lists are filtered on the server by what the viewer can
// view (PRD-04 §6.8: apps never filter lists in the client).
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { memberships, teams, users } from "@/db/schema";
import type { RequestContext } from "@/lib/context";
import { appAccess, levelsFor, aclList } from "@/modules/authz/service";
import { atLeast, type Level } from "@/modules/authz/levels";
import { isAdminRole } from "@/modules/authz/matrix";
import { projectChain, spaceChain } from "./access";
import { assigneeAllowed } from "./tasks";
import * as repo from "./repository";

export type ProjectSummary = { id: string; spaceId: string; name: string; description: string; archived: boolean; favorite: boolean; restricted: boolean; total: number; done: number; overdue: number };
export type SpaceSummary = { id: string; name: string; iconKey: string; description: string; level: Level; projects: ProjectSummary[]; everyone: boolean };

const viewLevel = (ctx: RequestContext, l: Level): Level => (isAdminRole(ctx.role) ? "manage" : l);

/** Spaces and projects the viewer can open, for the panel tree and space pages. */
export async function spaceTree(ctx: RequestContext, today: string): Promise<SpaceSummary[] | "NO_APP_ACCESS"> {
  const db = getDb();
  if ((await appAccess(db, ctx, "space")) !== "ok") return "NO_APP_ACCESS";
  const [spaces, projects, favs] = await Promise.all([repo.liveSpaces(db, ctx.organizationId), repo.liveProjects(db, ctx.organizationId), repo.favorites(db, ctx.organizationId, ctx.userId)]);
  const spaceLevels = await levelsFor(db, ctx, spaces.map((s) => spaceChain(s.id)));
  const projectLevels = await levelsFor(db, ctx, projects.map((p) => projectChain(p)));
  const visibleProjects = projects.filter((_, i) => atLeast(viewLevel(ctx, projectLevels[i]), "view"));
  const stats = await repo.projectTaskStats(db, ctx.organizationId, visibleProjects.map((p) => p.id), today);
  const spaceAcl = await Promise.all(spaces.map((s) => aclList(db, ctx.organizationId, { type: "space.space", id: s.id })));
  return spaces
    .map((s, i) => ({
      id: s.id,
      name: s.name,
      iconKey: s.iconKey,
      description: s.description,
      level: viewLevel(ctx, spaceLevels[i]),
      everyone: spaceAcl[i].some((r) => r.principalType === "org"),
      projects: visibleProjects
        .filter((p) => p.spaceId === s.id)
        .map((p) => {
          const st = stats.find((x) => x.projectId === p.id);
          return { id: p.id, spaceId: p.spaceId, name: p.name, description: p.description, archived: !!p.archivedAt, favorite: favs.includes(p.id), restricted: p.access === "restricted", total: st?.total ?? 0, done: st?.done ?? 0, overdue: st?.overdue ?? 0 };
        }),
    }))
    .filter((s) => atLeast(s.level, "view") || s.projects.length > 0);
}

export type AssigneeOption = { type: "user" | "team"; id: string; name: string };

/** Everything the project page needs for one board (TECH-01 §7 getProjectBoard). */
export async function projectBoard(ctx: RequestContext, projectId: string, boardId: string | undefined, level: Level) {
  const db = getDb();
  const project = (await repo.project(db, ctx.organizationId, projectId))!;
  const boards = await repo.boardsOf(db, ctx.organizationId, projectId);
  const board = boards.find((b) => b.id === boardId) ?? boards[0];
  const [columns, tasks] = await Promise.all([repo.columnsOf(db, ctx.organizationId, board.id), repo.tasksOfBoard(db, ctx.organizationId, board.id)]);
  const options = await assigneeOptions(ctx, project);
  const names = new Map(options.map((o) => [o.id, o.name]));
  const missing = [...new Set(tasks.map((t) => t.assigneeId).filter((id): id is string => !!id && !names.has(id)))];
  if (missing.length) {
    for (const u of await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, missing))) names.set(u.id, u.name);
    for (const t of await db.select({ id: teams.id, name: teams.name }).from(teams).where(and(eq(teams.organizationId, ctx.organizationId), inArray(teams.id, missing)))) names.set(t.id, t.name);
  }
  return {
    project: { id: project.id, spaceId: project.spaceId, name: project.name, description: project.description, archived: !!project.archivedAt, restricted: project.access === "restricted" },
    level,
    boards: boards.map((b) => ({ id: b.id, name: b.name })),
    board: { id: board.id, name: board.name },
    columns: columns.map((c) => ({ id: c.id, name: c.name, category: c.category })),
    tasks: tasks.map((t) => ({
      id: t.id,
      columnId: t.columnId,
      title: t.title,
      assignee: t.assigneeId ? { type: t.assigneeType!, id: t.assigneeId, name: names.get(t.assigneeId) ?? "—" } : null,
      dueDate: t.dueDate,
      priority: t.priority,
      version: t.version,
      done: !!t.doneAt,
    })),
    assignees: options,
  };
}

/** US-12: people who can view the project, and teams with an explicitly granted active member. */
export async function assigneeOptions(ctx: RequestContext, project: repo.ProjectRow): Promise<AssigneeOption[]> {
  const db = getDb();
  const people = await db
    .select({ id: users.id, name: users.name })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(memberships.organizationId, ctx.organizationId), eq(memberships.status, "active")));
  const out: AssigneeOption[] = [];
  for (const p of people) if (await assigneeAllowed(db, ctx.organizationId, project, { type: "user", id: p.id })) out.push({ type: "user", id: p.id, name: p.name });
  for (const t of await db.select().from(teams).where(eq(teams.organizationId, ctx.organizationId)))
    if (await assigneeAllowed(db, ctx.organizationId, project, { type: "team", id: t.id })) out.push({ type: "team", id: t.id, name: t.name });
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** Task detail modal (§8.1). */
export async function taskDetail(ctx: RequestContext, taskId: string) {
  const db = getDb();
  const t = await repo.task(db, ctx.organizationId, taskId);
  if (!t) return null;
  const [comments, creator, columns] = await Promise.all([
    repo.commentsOf(db, ctx.organizationId, taskId),
    db.select({ name: users.name }).from(users).where(eq(users.id, t.createdBy)),
    repo.columnsOf(db, ctx.organizationId, t.boardId),
  ]);
  return {
    id: t.id,
    projectId: t.projectId,
    boardId: t.boardId,
    columnId: t.columnId,
    title: t.title,
    description: t.description,
    assignee: t.assigneeId ? { type: t.assigneeType!, id: t.assigneeId } : null,
    dueDate: t.dueDate,
    priority: t.priority,
    version: t.version,
    createdAt: t.createdAt.toISOString(),
    createdBy: creator[0]?.name ?? "—",
    columns: columns.map((c) => ({ id: c.id, name: c.name, category: c.category })),
    comments: comments.map((c) => ({ id: c.id, body: c.body, author: c.authorName, createdAt: c.createdAt.toISOString() })),
  };
}

export type MyTask = { id: string; title: string; projectId: string; projectName: string; spaceId: string; dueDate: string | null; priority: string | null; done: boolean };

/**
 * Tugas saya (§6.3, US-5): open tasks assigned to me or one of my teams, in projects I can view and
 * that are not archived; plus what I finished in the last 30 days.
 */
export async function myTasks(ctx: RequestContext): Promise<MyTask[]> {
  const db = getDb();
  if ((await appAccess(db, ctx, "space")) !== "ok") return [];
  const teamIds = await repo.teamIdsOf(db, ctx.organizationId, ctx.userId);
  const rows = [
    ...(await repo.openTasksAssignedTo(db, ctx.organizationId, "user", [ctx.userId])),
    ...(await repo.openTasksAssignedTo(db, ctx.organizationId, "team", teamIds)),
    ...(await repo.recentlyDoneFor(db, ctx.organizationId, ctx.userId, teamIds)),
  ].filter((r) => !r.project.archivedAt);
  const projects = [...new Map(rows.map((r) => [r.project.id, r.project])).values()];
  const levels = await levelsFor(db, ctx, projects.map((p) => projectChain(p)));
  // Tugas saya lists only what the viewer can open without the governance override.
  const visible = new Set(projects.filter((_, i) => atLeast(levels[i], "view")).map((p) => p.id));
  const seen = new Set<string>();
  return rows
    .filter((r) => visible.has(r.project.id) && !seen.has(r.task.id) && seen.add(r.task.id))
    .map((r) => ({ id: r.task.id, title: r.task.title, projectId: r.project.id, projectName: r.project.name, spaceId: r.project.spaceId, dueDate: r.task.dueDate, priority: r.task.priority, done: r.category === "done" }));
}
