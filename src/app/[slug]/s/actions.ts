"use server";
// Server Actions for Space (TECH-01 §7). Each resolves the organization context, calls the service and
// maps its codes to i18n keys; the service enforces authorization (PRD-04 E2).
import { revalidatePath } from "next/cache";
import type { MessageKey } from "@/i18n";
import type { ColumnCategory, Priority } from "@/db/schema";
import { dispatchAfterResponse } from "@/modules/events";
import { requireOrg } from "@/modules/org/web";
import * as spaces from "@/modules/space/spaces";
import * as projects from "@/modules/space/projects";
import * as tasks from "@/modules/space/tasks";
import { taskDetail } from "@/modules/space/queries";
import { checkProject } from "@/modules/space/access";
import * as repo from "@/modules/space/repository";
import { getDb } from "@/db/client";

export type SpaceResult<T = object> = ({ ok: true; message?: MessageKey; args?: string[] } & T) | { ok: false; error: MessageKey; args?: string[]; conflict?: boolean };

const ERRORS: Record<string, MessageKey> = {
  INVALID: "task.invalid",
  TAKEN: "space.taken",
  NOT_FOUND: "people.error.notFound",
  FORBIDDEN: "people.error.forbidden",
  NO_APP_ACCESS: "space.noAccess.title",
  VERSION_CONFLICT: "project.conflict",
  ASSIGNEE_NO_ACCESS: "task.assigneeNoAccess",
  NOT_EMPTY: "project.columnNotEmpty",
  LAST_COLUMN: "people.error.forbidden",
  LAST_BOARD: "people.error.forbidden",
  LIMIT: "people.error.generic",
};

function fail(code: string): { ok: false; error: MessageKey; conflict?: boolean } {
  return { ok: false, error: ERRORS[code] ?? "people.error.generic", conflict: code === "VERSION_CONFLICT" || undefined };
}

async function after(slug: string, eventIds: string[]) {
  dispatchAfterResponse(eventIds);
  revalidatePath(`/${slug}`, "layout");
}

// ---------- spaces ----------

export async function createSpaceAction(slug: string, input: spaces.SpaceInput): Promise<SpaceResult<{ id: string }>> {
  const { ctx } = await requireOrg(slug);
  const r = await spaces.createSpace(ctx, input);
  if (!r.ok) return { ...fail(r.code), error: r.code === "INVALID" ? "space.nameInvalid" : fail(r.code).error };
  await after(slug, r.eventIds);
  return { ok: true, id: r.id, message: "space.saved" };
}

export async function updateSpaceAction(slug: string, id: string, input: Omit<spaces.SpaceInput, "access">): Promise<SpaceResult> {
  const { ctx } = await requireOrg(slug);
  const r = await spaces.updateSpace(ctx, id, input);
  if (!r.ok) return { ...fail(r.code), error: r.code === "INVALID" ? "space.nameInvalid" : fail(r.code).error };
  await after(slug, r.eventIds);
  return { ok: true, message: "space.saved" };
}

export async function deleteSpaceAction(slug: string, id: string): Promise<SpaceResult> {
  const { ctx } = await requireOrg(slug);
  const r = await spaces.deleteSpace(ctx, id);
  if (!r.ok) return r.code === "NOT_EMPTY" ? { ok: false, error: "space.notEmpty", args: [String(r.projects)] } : fail(r.code);
  await after(slug, r.eventIds);
  return { ok: true, message: "space.deleted" };
}

// ---------- projects, boards, columns ----------

export async function createProjectAction(slug: string, spaceId: string, name: string): Promise<SpaceResult<{ id: string }>> {
  const page = await requireOrg(slug);
  const r = await projects.createProject(page.ctx, spaceId, { name }, page.org.defaultLocale);
  if (!r.ok) return fail(r.code);
  await after(slug, r.eventIds);
  return { ok: true, id: r.id };
}

export async function setArchivedAction(slug: string, projectId: string, archived: boolean): Promise<SpaceResult> {
  const { ctx } = await requireOrg(slug);
  const r = await projects.setArchived(ctx, projectId, archived);
  if (!r.ok) return fail(r.code);
  await after(slug, r.eventIds);
  return { ok: true };
}

export async function deleteProjectAction(slug: string, projectId: string): Promise<SpaceResult<{ spaceId: string }>> {
  const { ctx } = await requireOrg(slug);
  const r = await projects.deleteProject(ctx, projectId);
  if (!r.ok) return fail(r.code);
  await after(slug, r.eventIds);
  return { ok: true, spaceId: r.spaceId };
}

export async function createBoardAction(slug: string, projectId: string, name: string): Promise<SpaceResult<{ id: string }>> {
  const page = await requireOrg(slug);
  const r = await projects.createBoard(page.ctx, projectId, name, page.org.defaultLocale);
  if (!r.ok) return fail(r.code);
  await after(slug, r.eventIds);
  return { ok: true, id: r.id };
}

export async function createColumnAction(slug: string, boardId: string, name: string, category: ColumnCategory): Promise<SpaceResult> {
  const { ctx } = await requireOrg(slug);
  const r = await projects.createColumn(ctx, boardId, name, category);
  if (!r.ok) return fail(r.code);
  await after(slug, r.eventIds);
  return { ok: true };
}

export async function renameColumnAction(slug: string, columnId: string, name: string): Promise<SpaceResult> {
  const { ctx } = await requireOrg(slug);
  const c = await repo.column(getDb(), ctx.organizationId, columnId);
  if (!c) return fail("NOT_FOUND");
  const r = await projects.updateColumn(ctx, columnId, { name, category: c.category });
  if (!r.ok) return fail(r.code);
  await after(slug, r.eventIds);
  return { ok: true };
}

export async function deleteColumnAction(slug: string, columnId: string): Promise<SpaceResult> {
  const { ctx } = await requireOrg(slug);
  const r = await projects.deleteColumn(ctx, columnId);
  if (!r.ok) return fail(r.code);
  await after(slug, r.eventIds);
  return { ok: true };
}

// ---------- tasks ----------

type TaskInput = { title: string; columnId?: string; boardId?: string; assignee?: tasks.Assignee; dueDate?: string | null; priority?: Priority | null; description?: string };

export async function createTaskAction(slug: string, projectId: string, input: TaskInput): Promise<SpaceResult<{ id: string }>> {
  const { ctx } = await requireOrg(slug);
  const r = await tasks.createTask(ctx, projectId, input);
  if (!r.ok) return fail(r.code);
  await after(slug, r.eventIds);
  return { ok: true, id: r.id, message: "task.created.toast" };
}

export async function updateTaskAction(slug: string, id: string, version: number, patch: tasks.TaskPatch): Promise<SpaceResult<{ version: number }>> {
  const { ctx } = await requireOrg(slug);
  const r = await tasks.updateTask(ctx, id, version, patch);
  if (!r.ok) return fail(r.code);
  await after(slug, r.eventIds);
  return { ok: true, version: r.version, message: "task.saved" };
}

export async function moveTaskAction(slug: string, id: string, version: number, columnId: string, index: number): Promise<SpaceResult<{ version: number }>> {
  const { ctx } = await requireOrg(slug);
  const r = await tasks.moveTask(ctx, id, version, { columnId, index });
  if (!r.ok) return { ...fail(r.code), error: r.code === "VERSION_CONFLICT" ? "project.conflict" : "project.moveFailed" };
  await after(slug, r.eventIds);
  return { ok: true, version: r.version };
}

export async function deleteTaskAction(slug: string, id: string): Promise<SpaceResult> {
  const { ctx } = await requireOrg(slug);
  const r = await tasks.deleteTask(ctx, id);
  if (!r.ok) return fail(r.code);
  await after(slug, r.eventIds);
  return { ok: true, message: "task.deleted" };
}

export async function addCommentAction(slug: string, taskId: string, body: string): Promise<SpaceResult> {
  const { ctx } = await requireOrg(slug);
  const r = await tasks.addComment(ctx, taskId, body);
  if (!r.ok) return fail(r.code);
  dispatchAfterResponse(r.eventIds);
  return { ok: true };
}

/** Task modal data, re-checked against the viewer's access every time it opens. */
export async function taskDetailAction(slug: string, taskId: string) {
  const { ctx } = await requireOrg(slug);
  const d = await taskDetail(ctx, taskId);
  if (!d) return null;
  const project = (await repo.project(getDb(), ctx.organizationId, d.projectId))!;
  const decision = await checkProject(ctx, "view", project);
  if (!decision.allow) return null;
  return { ...d, level: decision.level, archived: !!project.archivedAt };
}
