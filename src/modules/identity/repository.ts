// Identity tables are user-scoped (no organization_id): the only tables with readable PII (PRD-13 §5).
import { and, count, eq, gt, isNull, ne, sql } from "drizzle-orm";
import { consents, credentials, rateLimitHits, rateLimits, sessions, users, verificationTokens } from "@/db/schema";
import type { Db, Tx } from "@/db/client";

type Q = Db | Tx;
export type UserRow = typeof users.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type TokenPurpose = "verify_email" | "reset_password";

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export async function findUserByEmail(q: Q, email: string): Promise<UserRow | undefined> {
  const [row] = await q.select().from(users).where(sql`lower(${users.email}) = ${normalizeEmail(email)}`);
  return row;
}

export async function findUser(q: Q, id: string): Promise<UserRow | undefined> {
  const [row] = await q.select().from(users).where(eq(users.id, id));
  return row;
}

export async function passwordHashOf(q: Q, userId: string): Promise<string | undefined> {
  const [row] = await q.select({ h: credentials.passwordHash }).from(credentials).where(eq(credentials.userId, userId));
  return row?.h;
}

export async function insertUser(tx: Tx, u: { id: string; email: string; name: string; locale: "en" | "id" | null }, passwordHash: string) {
  await tx.insert(users).values({ id: u.id, email: normalizeEmail(u.email), name: u.name, locale: u.locale });
  await tx.insert(credentials).values({ userId: u.id, passwordHash });
}

export async function insertConsents(tx: Tx, rows: (typeof consents.$inferInsert)[]) {
  await tx.insert(consents).values(rows);
}

export async function setPassword(tx: Tx, userId: string, passwordHash: string) {
  await tx
    .insert(credentials)
    .values({ userId, passwordHash })
    .onConflictDoUpdate({ target: credentials.userId, set: { passwordHash, updatedAt: new Date() } });
}

export async function markEmailVerified(tx: Tx, userId: string) {
  await tx.update(users).set({ emailVerifiedAt: new Date(), updatedAt: new Date() }).where(and(eq(users.id, userId), isNull(users.emailVerifiedAt)));
}

export async function setLastOrganization(q: Q, userId: string, organizationId: string) {
  await q.update(users).set({ lastOrganizationId: organizationId }).where(eq(users.id, userId));
}

// ---------- sessions ----------
export async function insertSession(q: Q, s: typeof sessions.$inferInsert) {
  await q.insert(sessions).values(s);
}

export async function findSession(q: Q, id: string): Promise<SessionRow | undefined> {
  const [row] = await q.select().from(sessions).where(eq(sessions.id, id));
  return row;
}

export async function touchSession(q: Q, id: string, lastSeenAt: Date, expiresAt: Date) {
  await q.update(sessions).set({ lastSeenAt, expiresAt }).where(eq(sessions.id, id));
}

export async function deleteSession(q: Q, id: string) {
  await q.delete(sessions).where(eq(sessions.id, id));
}

/** Deletes every session of a user, optionally keeping one; returns how many went. */
export async function deleteUserSessions(q: Q, userId: string, keep?: string): Promise<number> {
  const rows = await q
    .delete(sessions)
    .where(keep ? and(eq(sessions.userId, userId), ne(sessions.id, keep)) : eq(sessions.userId, userId))
    .returning({ id: sessions.id });
  return rows.length;
}

// ---------- email tokens ----------
export async function insertToken(q: Q, t: typeof verificationTokens.$inferInsert) {
  await q.insert(verificationTokens).values(t);
}

/** Marks a live token used and returns it; a used, expired or unknown token returns undefined. */
export async function consumeToken(tx: Tx, id: string, purpose: TokenPurpose) {
  const [row] = await tx
    .update(verificationTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(verificationTokens.id, id), eq(verificationTokens.purpose, purpose), isNull(verificationTokens.usedAt), gt(verificationTokens.expiresAt, new Date())))
    .returning();
  return row;
}

// ---------- rate limits (PRD-01 §6.6) ----------
export async function recordHit(q: Q, key: string) {
  await q.insert(rateLimitHits).values({ key });
}

export async function hitsSince(q: Q, key: string, since: Date): Promise<number> {
  const [row] = await q.select({ n: count() }).from(rateLimitHits).where(and(eq(rateLimitHits.key, key), gt(rateLimitHits.at, since)));
  return row?.n ?? 0;
}

export async function clearHits(q: Q, key: string) {
  await q.delete(rateLimitHits).where(eq(rateLimitHits.key, key));
}

export async function lockedUntil(q: Q, key: string): Promise<Date | null> {
  const [row] = await q.select().from(rateLimits).where(and(eq(rateLimits.key, key), gt(rateLimits.lockedUntil, new Date())));
  return row?.lockedUntil ?? null;
}

export async function lock(q: Q, key: string, until: Date) {
  await q.insert(rateLimits).values({ key, lockedUntil: until }).onConflictDoUpdate({ target: rateLimits.key, set: { lockedUntil: until } });
}

export async function markAuthenticated(q: Q, sessionId: string) {
  await q.update(sessions).set({ lastAuthAt: new Date() }).where(eq(sessions.id, sessionId));
}
