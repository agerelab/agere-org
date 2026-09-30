// Keamanan (PRD-12 §4, PRD-01): change password, devices (Should), sign out everywhere, and the last
// 30 days of the user's security events.
import { and, desc, eq, gt } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sessions } from "@/db/schema";
import { publish } from "@/modules/events";
import { hashPassword, verifyPassword } from "@/modules/identity/crypto";
import * as idRepo from "@/modules/identity/repository";
import type { RequestMeta } from "@/modules/identity/service";
import * as repo from "./repository";

const userCtx = (userId: string, meta: RequestMeta) => ({ scope: "user" as const, actor: { type: "user" as const, userId }, requestId: meta.requestId });
const subject = (id: string) => ({ module: "identity", type: "user", id });

export const PASSWORD = { min: 8, max: 128 };

/**
 * "Ubah kata sandi": the current password must match; every other device is signed out, this one stays
 * (PRD-01). Publishes security.password.changed, which emails the user (PRD-10 §5).
 */
export async function changePassword(userId: string, sessionId: string, current: string, next: string, meta: RequestMeta): Promise<{ ok: true; eventIds: string[] } | { ok: false; code: "WRONG_PASSWORD" | "WEAK" }> {
  if (next.length < PASSWORD.min || next.length > PASSWORD.max) return { ok: false, code: "WEAK" };
  const db = getDb();
  const stored = await idRepo.passwordHashOf(db, userId);
  if (!stored || !(await verifyPassword(current, stored))) return { ok: false, code: "WRONG_PASSWORD" };
  const hash = await hashPassword(next);
  const eventIds = await db.transaction(async (tx) => {
    await idRepo.setPassword(tx, userId, hash);
    const revoked = await idRepo.deleteUserSessions(tx, userId, sessionId);
    await idRepo.markAuthenticated(tx, sessionId);
    const ids = [await publish(tx, userCtx(userId, meta), { type: "security.password.changed", subject: subject(userId), data: { via: "settings" } })];
    if (revoked) ids.push(await publish(tx, userCtx(userId, meta), { type: "security.session.revoked", subject: subject(userId), data: { reason: "password_changed", sessions: revoked } }));
    return ids;
  });
  return { ok: true, eventIds };
}

export type Device = { id: string; userAgent: string | null; lastSeenAt: string; createdAt: string; current: boolean };

/** Session list (Should): where this account is signed in. The id is the stored hash, never the token. */
export async function devices(userId: string, currentSessionId: string): Promise<Device[]> {
  const rows = await getDb().select().from(sessions).where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, new Date()))).orderBy(desc(sessions.lastSeenAt));
  return rows.map((s) => ({ id: s.id, userAgent: s.userAgent, lastSeenAt: s.lastSeenAt.toISOString(), createdAt: s.createdAt.toISOString(), current: s.id === currentSessionId }));
}

/** Sign out one other device. */
export async function revokeDevice(userId: string, sessionId: string, currentSessionId: string, meta: RequestMeta): Promise<{ ok: boolean; eventIds: string[] }> {
  if (sessionId === currentSessionId) return { ok: false, eventIds: [] };
  const db = getDb();
  return db.transaction(async (tx) => {
    const rows = await tx.delete(sessions).where(and(eq(sessions.userId, userId), eq(sessions.id, sessionId))).returning({ id: sessions.id });
    if (!rows.length) return { ok: false, eventIds: [] };
    return { ok: true, eventIds: [await publish(tx, userCtx(userId, meta), { type: "security.session.revoked", subject: subject(userId), data: { reason: "user_one_device", sessions: 1 } })] };
  });
}

export type SecurityEvent = { id: string; type: string; at: string; data: Record<string, unknown> };

/** Aktivitas keamanan: the user's own security.* events of the last 30 days, newest first. */
export async function securityActivity(userId: string): Promise<SecurityEvent[]> {
  const rows = await repo.securityEvents(getDb(), userId);
  return rows.map((r) => ({ id: r.eventId, type: r.type, at: r.occurredAt.toISOString(), data: r.data }));
}
