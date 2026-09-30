// Akun & data (PRD-12 §5.4, PRD-13 §6.3): account deletion guarded by memberships, and "Unduh data saya"
// (Should). Deleting stops sign-in at once; name, email, avatar and credentials are scrubbed by the
// hourly job, leaving a tombstone that reads "Pengguna terhapus".
import { and, eq, isNull, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { credentials, memberships, organizations, sessions, taskComments, tasks, userAvatars, users, verificationTokens } from "@/db/schema";
import { publish } from "@/modules/events";
import type { RequestMeta } from "@/modules/identity/service";
import * as repo from "./repository";

export const REAUTH_WINDOW_MS = 10 * 60 * 1000;
export const DELETED_NAME = "Pengguna terhapus";

export type Blocker = { id: string; slug: string; name: string; role: string; soleOwner: boolean };

/** Organizations the user still belongs to (active or suspended), and where they are the only Owner. */
export async function deletionBlockers(userId: string): Promise<Blocker[]> {
  const db = getDb();
  const mine = await db
    .select({ id: organizations.id, slug: organizations.slug, name: organizations.name, role: memberships.role })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(eq(memberships.userId, userId));
  if (!mine.length) return [];
  const owners = await repo.ownerCounts(db, mine.map((m) => m.id));
  return mine
    .map((m) => ({ ...m, soleOwner: m.role === "owner" && (owners.find((o) => o.org === m.id)?.n ?? 0) <= 1 }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * "Hapus akun" (§5.4): only with no memberships left, and within 10 minutes of re-authentication.
 * Sessions end, sign-in stops, identity.account.deletion_requested is published (it emails the user).
 */
export async function deleteAccount(userId: string, lastAuthAt: Date, meta: RequestMeta): Promise<{ ok: true; eventIds: string[] } | { ok: false; code: "HAS_ORGANIZATIONS" | "REAUTH_REQUIRED" }> {
  if ((await deletionBlockers(userId)).length) return { ok: false, code: "HAS_ORGANIZATIONS" };
  if (Date.now() - lastAuthAt.getTime() > REAUTH_WINDOW_MS) return { ok: false, code: "REAUTH_REQUIRED" };
  const eventIds = await getDb().transaction(async (tx) => {
    await tx.update(users).set({ status: "deleted", deletedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, userId));
    await tx.delete(sessions).where(eq(sessions.userId, userId));
    await tx.delete(credentials).where(eq(credentials.userId, userId));
    await tx.delete(verificationTokens).where(eq(verificationTokens.userId, userId));
    return [
      await publish(tx, { scope: "user", actor: { type: "user", userId }, requestId: meta.requestId }, {
        type: "identity.account.deletion_requested",
        subject: { module: "identity", type: "user", id: userId },
      }),
    ];
  });
  return { ok: true, eventIds };
}

/**
 * PRD-13 §6.3 step 3: scrub deleted accounts. Waits an hour so the confirmation email can go out
 * first; the user id stays as a tombstone and the email address is released.
 */
export async function scrubDeletedAccounts(olderThanMinutes = 60) {
  const db = getDb();
  const due = await repo.dueForScrub(db, olderThanMinutes);
  for (const { id } of due)
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ name: DELETED_NAME, email: `deleted-${id}@deleted.invalid`, title: null, timezone: null, avatarUpdatedAt: null, scrubbedAt: new Date() })
        .where(eq(users.id, id));
      await tx.delete(userAvatars).where(eq(userAvatars.userId, id));
      await publish(tx, { scope: "user", actor: { type: "system" } }, { type: "identity.account.deleted", subject: { module: "identity", type: "user", id } });
    });
  return due.length;
}

/** "Unduh data saya" (Should, JSON): the profile, memberships, and the tasks and comments the user wrote or holds. */
export async function exportMyData(userId: string) {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  const orgs = await db
    .select({ organization: organizations.name, slug: organizations.slug, role: memberships.role, status: memberships.status, joinedAt: memberships.joinedAt })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(eq(memberships.userId, userId));
  const myTasks = await db
    .select({ id: tasks.id, title: tasks.title, description: tasks.description, dueDate: tasks.dueDate, createdAt: tasks.createdAt, doneAt: tasks.doneAt })
    .from(tasks)
    .where(and(isNull(tasks.deletedAt), or(eq(tasks.createdBy, userId), and(eq(tasks.assigneeType, "user"), eq(tasks.assigneeId, userId)))));
  const comments = await db.select({ id: taskComments.id, taskId: taskComments.taskId, body: taskComments.body, createdAt: taskComments.createdAt }).from(taskComments).where(eq(taskComments.authorId, userId));
  return {
    format: "agere-org/my-data@1",
    exportedAt: new Date().toISOString(),
    profile: user ? { name: user.name, email: user.email, title: user.title, locale: user.locale, timezone: user.timezone, theme: user.theme, createdAt: user.createdAt } : null,
    organizations: orgs,
    tasks: myTasks,
    comments,
  };
}
