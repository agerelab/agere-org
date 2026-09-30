// Kotak masuk (PRD-10 §6–7): read-time authorization, tabs, counts, read and archive. Items the
// reader can no longer view are hidden, not deleted, so they come back if access returns (US-4).
import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { projects, users } from "@/db/schema";
import type { RequestContext } from "@/lib/context";
import { appAccess, levelsFor } from "@/modules/authz/service";
import { atLeast } from "@/modules/authz/levels";
import { isAdminRole } from "@/modules/authz/matrix";
import { projectChain } from "@/modules/space/access";
import * as repo from "./repository";
import type { InboxItem, InboxTab, Kind } from "./types";

/** The rows of this inbox the reader may see now (checkBatch, PRD-04). */
async function visibleRows(ctx: RequestContext) {
  const db = getDb();
  const rows = await repo.inboxRows(db, ctx.organizationId, ctx.userId);
  const projectIds = [...new Set(rows.filter((r) => r.subjectType === "space.project" && r.subjectId).map((r) => r.subjectId!))];
  const allowed = new Set<string>();
  if (projectIds.length && (await appAccess(db, ctx, "space")) === "ok") {
    const live = await db.select().from(projects).where(and(eq(projects.organizationId, ctx.organizationId), inArray(projects.id, projectIds), isNull(projects.deletedAt)));
    if (isAdminRole(ctx.role)) live.forEach((p) => allowed.add(p.id));
    else {
      const levels = await levelsFor(db, ctx, live.map((p) => projectChain(p)));
      live.forEach((p, i) => atLeast(levels[i], "view") && allowed.add(p.id));
    }
  }
  return rows.filter((r) => !r.subjectType || (r.subjectId && allowed.has(r.subjectId)));
}

export type Inbox = { items: InboxItem[]; counts: Record<InboxTab, number>; hasMore: boolean };

/** One page of a tab (50 items, §6) with the counts of every tab. */
export async function inbox(ctx: RequestContext, tab: InboxTab = "all", limit = 50): Promise<Inbox> {
  const rows = await visibleRows(ctx);
  const counts = { all: rows.length, unread: rows.filter((r) => !r.readAt).length, forMe: rows.filter((r) => r.forMe).length };
  const inTab = rows.filter((r) => (tab === "unread" ? !r.readAt : tab === "forMe" ? r.forMe : true));
  const page = inTab.slice(0, limit);
  const actorIds = [...new Set(page.map((r) => r.actorUserId).filter((x): x is string => !!x))];
  const names = new Map(actorIds.length ? (await getDb().select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, actorIds))).map((u) => [u.id, u.name]) : []);
  return {
    items: page.map((r) => ({
      id: r.id,
      kind: r.type as Kind,
      vars: r.vars,
      actorName: r.actorUserId ? (names.get(r.actorUserId) ?? null) : null,
      createdAt: r.createdAt.toISOString(),
      read: !!r.readAt,
      forMe: r.forMe,
    })),
    counts,
    hasMore: inTab.length > limit,
  };
}

/** The Desk badge (§6): visible unread items only. */
export async function unreadCount(ctx: RequestContext): Promise<number> {
  return (await visibleRows(ctx)).filter((r) => !r.readAt).length;
}

/** "Tandai semua dibaca" (US-3): every visible item of this organization. */
export async function markAllRead(ctx: RequestContext) {
  const rows = (await visibleRows(ctx)).filter((r) => !r.readAt);
  await repo.markRead(getDb(), ctx.organizationId, ctx.userId, rows.map((r) => r.id));
  return rows.length;
}

export async function markRead(ctx: RequestContext, id: string) {
  await repo.markRead(getDb(), ctx.organizationId, ctx.userId, [id]);
}

export async function archive(ctx: RequestContext, id: string) {
  return repo.archive(getDb(), ctx.organizationId, ctx.userId, id);
}

/**
 * Opening an item (§6 deep links): marks it read and returns where to go, or null when the target is
 * gone or the reader lost access ("Item ini sudah dihapus atau Anda tidak punya akses.").
 */
export async function open(ctx: RequestContext, id: string): Promise<string | null | "NOT_FOUND"> {
  const db = getDb();
  const row = await repo.one(db, ctx.organizationId, ctx.userId, id);
  if (!row) return "NOT_FOUND";
  await repo.markRead(db, ctx.organizationId, ctx.userId, [id]);
  const visible = (await visibleRows(ctx)).some((r) => r.id === id) || !!row.archivedAt;
  if (!visible || !row.targetUrl) return null;
  // A task that went to Sampah after the notification: the missing-item state, not a broken modal.
  const taskId = typeof row.vars.taskId === "string" ? row.vars.taskId : null;
  if (taskId) {
    const { task } = await import("@/modules/space/repository");
    if (!(await task(db, ctx.organizationId, taskId))) return null;
  }
  return row.targetUrl;
}

/** Organizations (ids) where this user has unread items: the switcher dots (§6). */
export async function orgsWithUnread(userId: string) {
  return repo.orgsWithUnread(getDb(), userId);
}
