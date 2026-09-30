// Notification tables (PRD-10 §6). Every query names the recipient and, for the inbox, the organization.
import { and, count, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { notificationEmails, notifications } from "@/db/schema";
import type { Db, Tx } from "@/db/client";

type Q = Db | Tx;
export type NotificationRow = typeof notifications.$inferSelect;
export const RETENTION_DAYS = 90;

/** Inserts items; a repeated (recipient, organization, dedupe key) is ignored (PRD-00b D5). */
export async function insertMany(q: Q, rows: (typeof notifications.$inferInsert)[]) {
  if (!rows.length) return 0;
  const out = await q.insert(notifications).values(rows).onConflictDoNothing().returning({ id: notifications.id });
  return out.length;
}

/** The newest non-archived items of one inbox (bounded; the 90-day purge keeps this small). */
export async function inboxRows(q: Q, orgId: string, userId: string, limit = 1000) {
  return q
    .select()
    .from(notifications)
    .where(and(eq(notifications.organizationId, orgId), eq(notifications.recipientUserId, userId), isNull(notifications.archivedAt)))
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(limit);
}

export async function one(q: Q, orgId: string, userId: string, id: string) {
  const [row] = await q
    .select()
    .from(notifications)
    .where(and(eq(notifications.organizationId, orgId), eq(notifications.recipientUserId, userId), eq(notifications.id, id)));
  return row;
}

export async function markRead(q: Q, orgId: string, userId: string, ids: string[]) {
  if (!ids.length) return;
  await q
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.organizationId, orgId), eq(notifications.recipientUserId, userId), inArray(notifications.id, ids), isNull(notifications.readAt)));
}

export async function archive(q: Q, orgId: string, userId: string, id: string) {
  const rows = await q
    .update(notifications)
    .set({ archivedAt: new Date(), readAt: sql`coalesce(${notifications.readAt}, now())` })
    .where(and(eq(notifications.organizationId, orgId), eq(notifications.recipientUserId, userId), eq(notifications.id, id), isNull(notifications.archivedAt)))
    .returning({ id: notifications.id });
  return rows.length > 0;
}

/** Organizations of this user with at least one unread item (the switcher dots, §6). */
export async function orgsWithUnread(q: Q, userId: string): Promise<string[]> {
  const rows = await q
    .select({ orgId: notifications.organizationId, n: count() })
    .from(notifications)
    .where(and(eq(notifications.recipientUserId, userId), isNull(notifications.readAt), isNull(notifications.archivedAt)))
    .groupBy(notifications.organizationId);
  return rows.filter((r) => r.n > 0).map((r) => r.orgId);
}

/** §6 / PRD-13: items older than 90 days no longer exist. */
export async function purgeOld(q: Q) {
  const rows = await q
    .delete(notifications)
    .where(lt(notifications.createdAt, sql`now() - make_interval(days => ${RETENTION_DAYS})`))
    .returning({ id: notifications.id });
  await q.delete(notificationEmails).where(lt(notificationEmails.sentAt, sql`now() - make_interval(days => ${RETENTION_DAYS})`));
  return rows.length;
}

export async function emailSent(q: Q, key: string, email: string) {
  const [row] = await q.select().from(notificationEmails).where(and(eq(notificationEmails.dedupeKey, key), eq(notificationEmails.email, email)));
  return !!row;
}

export async function recordEmail(q: Q, key: string, email: string) {
  await q.insert(notificationEmails).values({ dedupeKey: key, email }).onConflictDoNothing();
}
