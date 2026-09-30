// Identity (PRD-01): email + password accounts, DB sessions, verification, reset, abuse protection.
import { getDb, type Tx } from "@/db/client";
import { uuidv7 } from "@/lib/ids";
import { publish } from "@/modules/events";
import { translator, type Locale } from "@/i18n";
import { DUMMY_HASH, hashPassword, ipHash, randomToken, tokenHash, verifyPassword } from "./crypto";
import { sendEmail } from "./email";
import * as repo from "./repository";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** Session policy (PRD-01 §6.2) [H]: 7 days idle, 30 days absolute. */
export const SESSION_IDLE_MS = 7 * DAY;
export const SESSION_ABSOLUTE_MS = 30 * DAY;
/** Abuse protection (PRD-01 §6.6) [H]. */
export const LOCKOUT = { window: 15 * MIN, account: 5, ip: 20, duration: 15 * MIN };
export const EMAILS_PER_HOUR = 3;
const TOKEN_TTL = { verify_email: DAY, reset_password: HOUR } as const;
export const CONSENT_VERSION = "2026-09";

/** Where a request comes from; the IP is only ever stored hashed. */
export type RequestMeta = { ip?: string | null; userAgent?: string | null; requestId?: string; appUrl: string };
export type SessionUser = repo.UserRow;

const userCtx = (userId: string, meta: RequestMeta) => ({ scope: "user" as const, actor: { type: "user" as const, userId }, requestId: meta.requestId });
const userSubject = (id: string) => ({ module: "identity", type: "user", id });
const localeOf = (u: { locale: Locale | null }): Locale => u.locale ?? "en";

// ---------- sessions ----------

async function createSession(q: Parameters<typeof repo.insertSession>[0], userId: string, meta: RequestMeta) {
  const token = randomToken();
  const now = new Date();
  await repo.insertSession(q, {
    id: tokenHash(token),
    userId,
    createdAt: now,
    lastSeenAt: now,
    lastAuthAt: now,
    expiresAt: new Date(now.getTime() + SESSION_IDLE_MS),
    userAgent: meta.userAgent?.slice(0, 300) ?? null,
    ipHash: ipHash(meta.ip),
  });
  return token;
}

/**
 * Loads the session behind a cookie token on every request, so a deleted row is signed out on the
 * next request (US-6). Extends the idle window at most once an hour to keep writes low.
 */
export async function getSession(token: string | undefined | null): Promise<{ user: SessionUser; sessionId: string; lastAuthAt: Date } | null> {
  if (!token) return null;
  const db = getDb();
  const s = await repo.findSession(db, tokenHash(token));
  if (!s) return null;
  const now = Date.now();
  if (s.expiresAt.getTime() <= now || s.createdAt.getTime() + SESSION_ABSOLUTE_MS <= now) {
    await repo.deleteSession(db, s.id);
    return null;
  }
  const user = await repo.findUser(db, s.userId);
  if (!user || user.status !== "active") return null;
  if (now - s.lastSeenAt.getTime() > HOUR) {
    const expires = Math.min(now + SESSION_IDLE_MS, s.createdAt.getTime() + SESSION_ABSOLUTE_MS);
    await repo.touchSession(db, s.id, new Date(now), new Date(expires));
  }
  return { user, sessionId: s.id, lastAuthAt: s.lastAuthAt };
}

export async function signOut(token: string | undefined | null) {
  if (token) await repo.deleteSession(getDb(), tokenHash(token));
}

/** "Keluar dari semua perangkat" (US-6). */
export async function signOutAll(userId: string, meta: RequestMeta): Promise<string[]> {
  return getDb().transaction(async (tx) => {
    const n = await repo.deleteUserSessions(tx, userId);
    return [await publish(tx, userCtx(userId, meta), { type: "security.session.revoked", subject: userSubject(userId), data: { reason: "user_all_devices", sessions: n } })];
  });
}

// ---------- email links ----------

async function sendLink(user: repo.UserRow, purpose: repo.TokenPurpose, meta: RequestMeta) {
  const db = getDb();
  const key = `email:${purpose}:${repo.normalizeEmail(user.email)}`;
  if ((await repo.hitsSince(db, key, new Date(Date.now() - HOUR))) >= EMAILS_PER_HOUR) return;
  await repo.recordHit(db, key);
  const token = randomToken();
  await repo.insertToken(db, { id: tokenHash(token), userId: user.id, purpose, expiresAt: new Date(Date.now() + TOKEN_TTL[purpose]) });
  const t = translator(localeOf(user));
  const link = `${meta.appUrl}/${purpose === "verify_email" ? "verifikasi" : "reset-kata-sandi"}?token=${token}`;
  const [subject, body] = purpose === "verify_email" ? (["email.verify.subject", "email.verify.body"] as const) : (["email.reset.subject", "email.reset.body"] as const);
  await sendEmail({ to: user.email, subject: t(subject), text: t(body, user.name, link) });
}

export async function resendVerification(user: repo.UserRow, meta: RequestMeta) {
  if (!user.emailVerifiedAt) await sendLink(user, "verify_email", meta);
}

// ---------- sign-up, verification ----------

export type SignUpInput = { name: string; email: string; password: string; locale: Locale | null };

/**
 * Creates the account, records Terms and Privacy consent (PRD-13 §6.5), signs the user in and sends
 * the verification link. An email that already has an account gets a notice instead, and the caller
 * shows the same "check your email" screen, so sign-up does not reveal who has an account.
 */
export async function signUp(input: SignUpInput, meta: RequestMeta): Promise<{ sessionToken: string | null }> {
  const db = getDb();
  const existing = await repo.findUserByEmail(db, input.email);
  if (existing) {
    const t = translator(localeOf(existing));
    await sendEmail({ to: existing.email, subject: t("email.exists.subject"), text: t("email.exists.body", existing.name, `${meta.appUrl}/masuk`) });
    return { sessionToken: null };
  }
  const id = uuidv7();
  const passwordHash = await hashPassword(input.password);
  const sessionToken = await db.transaction(async (tx) => {
    await repo.insertUser(tx, { id, email: input.email, name: input.name.trim(), locale: input.locale }, passwordHash);
    await repo.insertConsents(tx, [
      { id: uuidv7(), userId: id, kind: "terms", version: CONSENT_VERSION, ipHash: ipHash(meta.ip) },
      { id: uuidv7(), userId: id, kind: "privacy", version: CONSENT_VERSION, ipHash: ipHash(meta.ip) },
    ]);
    return createSession(tx, id, meta);
  });
  const user = await repo.findUser(db, id);
  if (user) await sendLink(user, "verify_email", meta);
  return { sessionToken };
}

/** Opens a verification link (US-2). Single use, 24 hours. */
export async function verifyEmail(token: string): Promise<{ ok: true; userId: string } | { ok: false }> {
  const row = await getDb().transaction(async (tx) => {
    const t = await repo.consumeToken(tx, tokenHash(token), "verify_email");
    if (t) await repo.markEmailVerified(tx, t.userId);
    return t;
  });
  return row ? { ok: true, userId: row.userId } : { ok: false };
}

// ---------- sign-in (US-1, US-4) ----------

export type SignInResult = { ok: true; sessionToken: string; user: repo.UserRow; eventIds: string[] } | { ok: false; code: "INVALID" | "LOCKED"; eventIds: string[] };

export async function signIn(email: string, password: string, meta: RequestMeta): Promise<SignInResult> {
  const db = getDb();
  const acctKey = `login:acct:${repo.normalizeEmail(email)}`;
  const ipKey = meta.ip ? `login:ip:${ipHash(meta.ip)}` : null;
  // A locked account or IP is refused even with the right password (US-4).
  if ((await repo.lockedUntil(db, acctKey)) || (ipKey && (await repo.lockedUntil(db, ipKey)))) return { ok: false, code: "LOCKED", eventIds: [] };

  const user = await repo.findUserByEmail(db, email);
  const stored = user && user.status === "active" ? await repo.passwordHashOf(db, user.id) : undefined;
  const valid = await verifyPassword(password, stored ?? DUMMY_HASH);
  if (user && stored && valid) {
    await repo.clearHits(db, acctKey);
    return { ok: true, sessionToken: await createSession(db, user.id, meta), user, eventIds: [] };
  }

  const since = new Date(Date.now() - LOCKOUT.window);
  const until = new Date(Date.now() + LOCKOUT.duration);
  const eventIds: string[] = [];
  await repo.recordHit(db, acctKey);
  if (ipKey) await repo.recordHit(db, ipKey);
  if ((await repo.hitsSince(db, acctKey, since)) >= LOCKOUT.account) {
    await db.transaction(async (tx) => {
      await repo.lock(tx, acctKey, until);
      if (user) eventIds.push(await publish(tx, userCtx(user.id, meta), { type: "security.login.failed_threshold", subject: userSubject(user.id), data: { locked_until: until.toISOString() } }));
    });
  }
  if (ipKey && (await repo.hitsSince(db, ipKey, since)) >= LOCKOUT.ip) await repo.lock(db, ipKey, until);
  return { ok: false, code: "INVALID", eventIds };
}

// ---------- password reset (US-3) ----------

/** Always "sent" from the caller's point of view, whether or not the email has an account. */
export async function requestReset(email: string, meta: RequestMeta) {
  const user = await repo.findUserByEmail(getDb(), email);
  if (user && user.status === "active") await sendLink(user, "reset_password", meta);
}

export type ResetResult = { ok: true; sessionToken: string; eventIds: string[] } | { ok: false };

/** Sets a new password from a live link, revokes every session and signs in on this device. */
export async function resetPassword(token: string, password: string, meta: RequestMeta): Promise<ResetResult> {
  const passwordHash = await hashPassword(password);
  return getDb().transaction(async (tx: Tx): Promise<ResetResult> => {
    const t = await repo.consumeToken(tx, tokenHash(token), "reset_password");
    if (!t) return { ok: false };
    await repo.setPassword(tx, t.userId, passwordHash);
    // Opening the reset link proves the mailbox, so the email counts as verified too.
    await repo.markEmailVerified(tx, t.userId);
    const revoked = await repo.deleteUserSessions(tx, t.userId);
    const ctx = userCtx(t.userId, meta);
    const eventIds = [
      await publish(tx, ctx, { type: "security.password.changed", subject: userSubject(t.userId), data: { via: "reset" } }),
      await publish(tx, ctx, { type: "security.session.revoked", subject: userSubject(t.userId), data: { reason: "password_reset", sessions: revoked } }),
    ];
    return { ok: true, sessionToken: await createSession(tx, t.userId, meta), eventIds };
  });
}

// ---------- re-authentication (PRD-01 §6.3) ----------

/** Confirms the password for a sensitive action and restarts the 10-minute window on this session. */
export async function reauthenticate(sessionId: string, userId: string, password: string): Promise<boolean> {
  const db = getDb();
  const stored = await repo.passwordHashOf(db, userId);
  if (!stored || !(await verifyPassword(password, stored))) return false;
  await repo.markAuthenticated(db, sessionId);
  return true;
}
