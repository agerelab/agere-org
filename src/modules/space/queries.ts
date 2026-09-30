// Read side of Space (TECH-01 §7 loaders). Lists are filtered on the server by what the viewer can
// view (PRD-04 §6.8: apps never filter lists in the client).
import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { boardColumns, memberships, tasks, teams, users } from "@/db/schema";
import type { RequestContext } from "@/lib/context";
import { appAccess, levelsFor, aclList, whoCanAccess } from "@/modules/authz/service";
import { addDays, todayIn } from "@/lib/dates";
import { atLeast, type Level } from "@/modules/authz/levels";
import { isAdminRole } from "@/modules/authz/matrix";
import { APP, projectChain, spaceChain } from "./access";
import { assigneeAllowed } from "./tasks";
import * as repo from "./repository";

export type ProjectSummary = { id: string; spaceId: string; name: string; description: string; archived: boolean; favorite: boolean; restricted: boolean; status: "on_track" | "at_risk" | "off_track" | null; total: number; done: number; overdue: number };
export type SpaceSummary = { id: string; name: string; iconKey: string; iconAssetId: string | null; description: string; level: Level; projects: ProjectSummary[]; everyone: boolean };

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
      iconAssetId: s.iconAssetId,
      description: s.description,
      level: viewLevel(ctx, spaceLevels[i]),
      everyone: spaceAcl[i].some((r) => r.principalType === "org"),
      projects: visibleProjects
        .filter((p) => p.spaceId === s.id)
        .map((p) => {
          const st = stats.find((x) => x.projectId === p.id);
          return { id: p.id, spaceId: p.spaceId, name: p.name, description: p.description, archived: !!p.archivedAt, favorite: favs.includes(p.id), restricted: p.access === "restricted", status: p.status, total: st?.total ?? 0, done: st?.done ?? 0, overdue: st?.overdue ?? 0 };
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

// ---------- project header, Ringkasan and Anggota (§6.7, §6.8, v2.2 D50) ----------

export type ProjectHeader = {
  favorite: boolean;
  status: "on_track" | "at_risk" | "off_track" | null;
  statusNote: string | null;
  statusUpdatedAt: string | null;
  statusUpdatedBy: string | null;
  targetDate: string | null;
  owner: { id: string; name: string } | null;
  access: "everyone" | "space" | "restricted";
  people: { id: string; name: string }[];
};

/** What every project view shows in its header; `people` is the same source as the Members tab. */
export async function projectHeader(ctx: RequestContext, project: repo.ProjectRow): Promise<ProjectHeader> {
  const db = getDb();
  const [favs, access, spaceAcl] = await Promise.all([
    repo.favorites(db, ctx.organizationId, ctx.userId),
    whoCanAccess(db, ctx.organizationId, APP, projectChain(project)),
    aclList(db, ctx.organizationId, { type: "space.space", id: project.spaceId }),
  ]);
  const ids = [...new Set([...access.map((a) => a.userId), project.ownerUserId, project.statusUpdatedBy].filter((x): x is string => !!x))];
  const names = new Map(ids.length ? (await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, ids))).map((u) => [u.id, u.name]) : []);
  return {
    favorite: favs.includes(project.id),
    status: project.status,
    statusNote: project.statusNote,
    statusUpdatedAt: project.statusUpdatedAt?.toISOString() ?? null,
    statusUpdatedBy: project.statusUpdatedBy ? (names.get(project.statusUpdatedBy) ?? null) : null,
    targetDate: project.targetDate,
    owner: project.ownerUserId ? { id: project.ownerUserId, name: names.get(project.ownerUserId) ?? "—" } : null,
    access: project.access === "restricted" ? "restricted" : spaceAcl.some((r) => r.principalType === "org") ? "everyone" : "space",
    people: access.map((a) => ({ id: a.userId, name: names.get(a.userId) ?? "—" })).sort((a, b) => a.name.localeCompare(b.name)),
  };
}

type TaskFact = { assigneeType: "user" | "team" | null; assigneeId: string | null; dueDate: string | null; doneAt: Date | null; category: string; boardId: string };

async function projectFacts(projectId: string, orgId: string): Promise<TaskFact[]> {
  return getDb()
    .select({ assigneeType: tasks.assigneeType, assigneeId: tasks.assigneeId, dueDate: tasks.dueDate, doneAt: tasks.doneAt, category: boardColumns.category, boardId: tasks.boardId })
    .from(tasks)
    .innerJoin(boardColumns, and(eq(boardColumns.organizationId, tasks.organizationId), eq(boardColumns.id, tasks.columnId)))
    .where(and(eq(tasks.organizationId, orgId), eq(tasks.projectId, projectId), isNull(tasks.deletedAt), isNull(tasks.parentTaskId)));
}

export type ProjectKpis = { open: number; overdue: number; dueSoon: number; unassigned: number; done: number; total: number };

/** Ringkasan KPIs (§6.7): top-level tasks across the project's boards (§6.13), "today" in the org timezone. */
export async function projectKpis(ctx: RequestContext, projectId: string, today: string): Promise<ProjectKpis> {
  const facts = await projectFacts(projectId, ctx.organizationId);
  const soon = addDays(today, 7);
  const open = facts.filter((f) => f.category !== "done");
  return {
    open: open.length,
    overdue: open.filter((f) => f.dueDate && f.dueDate < today).length,
    dueSoon: open.filter((f) => f.dueDate && f.dueDate >= today && f.dueDate <= soon).length,
    unassigned: open.filter((f) => !f.assigneeId).length,
    done: facts.length - open.length,
    total: facts.length,
  };
}

export type MemberRow = { id: string; name: string; email: string; lead: boolean; open: number; overdue: number; done30: number; onTime: number | null; lastActiveAt: string | null };

/**
 * Members tab (v2.2, D50): the people who can open the project (same source as the header) with
 * numbers from this project only. Tepat waktu = share of tasks done in the last 30 days, with a due
 * date, finished on or before that day in the organization's timezone; null ("—") when none.
 */
export async function projectMembers(ctx: RequestContext, project: repo.ProjectRow, today: string, timezone: string): Promise<{ rows: MemberRow[]; open: number; unassigned: number; overdue: number }> {
  const db = getDb();
  const [access, facts] = await Promise.all([whoCanAccess(db, ctx.organizationId, APP, projectChain(project)), projectFacts(project.id, ctx.organizationId)]);
  const ids = access.map((a) => a.userId);
  const people = ids.length
    ? await db
        .select({ id: users.id, name: users.name, email: users.email, lastActiveAt: memberships.lastActiveAt })
        .from(memberships)
        .innerJoin(users, eq(users.id, memberships.userId))
        .where(and(eq(memberships.organizationId, ctx.organizationId), inArray(memberships.userId, ids)))
    : [];
  const since = Date.now() - 30 * 86_400_000;
  const day = (d: Date) => todayIn(timezone, d);
  const rows = people.map((p) => {
    const mine = facts.filter((f) => f.assigneeType === "user" && f.assigneeId === p.id);
    const open = mine.filter((f) => f.category !== "done");
    const recent = mine.filter((f) => f.category === "done" && f.doneAt && f.doneAt.getTime() >= since);
    const dated = recent.filter((f) => f.dueDate);
    return {
      id: p.id,
      name: p.name,
      email: p.email,
      lead: p.id === project.ownerUserId,
      open: open.length,
      overdue: open.filter((f) => f.dueDate && f.dueDate < today).length,
      done30: recent.length,
      onTime: dated.length ? Math.round((dated.filter((f) => day(f.doneAt!) <= f.dueDate!).length / dated.length) * 100) : null,
      lastActiveAt: p.lastActiveAt?.toISOString() ?? null,
    };
  });
  const open = facts.filter((f) => f.category !== "done");
  return {
    rows: rows.sort((a, b) => a.name.localeCompare(b.name)),
    open: open.length,
    unassigned: open.filter((f) => !f.assigneeId).length,
    overdue: open.filter((f) => f.dueDate && f.dueDate < today).length,
  };
}
