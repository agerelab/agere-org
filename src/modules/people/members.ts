// Members (PRD-03 §6.1, §6.3; PRD-04 §6.2 guardrails G1–G4).
import "@/modules/registry";
import { getDb, type Tx } from "@/db/client";
import { uuidv7 } from "@/lib/ids";
import type { RequestContext, Role } from "@/lib/context";
import { publish } from "@/modules/events";
import { appAccess } from "@/modules/authz/service";
import { can, canActOn, canChangeRole, isAdminRole } from "@/modules/authz/matrix";
import { workProviders } from "@/modules/authz/work";
import * as repo from "./repository";
import { orgCtx, type Fail } from "./shared";

export const REAUTH_WINDOW_MS = 10 * 60 * 1000;

export type MemberView = {
  userId: string;
  name: string;
  email: string | null;
  role: Role;
  status: "active" | "suspended";
  joinedAt: Date;
  lastActiveAt: Date | null;
  teams: { id: string; name: string }[];
};

/** Member list (PRD-03 §5). Emails only for Owners and Admins (TECH-01 §7 contract rule). */
export async function listMembers(ctx: RequestContext): Promise<MemberView[]> {
  const db = getDb();
  const rows = await repo.memberRows(db, ctx.organizationId);
  const teams = await repo.teamsOfUsers(db, ctx.organizationId, rows.map((r) => r.userId));
  const showEmail = isAdminRole(ctx.role);
  return rows.map((r) => ({
    userId: r.userId,
    name: r.name,
    email: showEmail || r.userId === ctx.userId ? r.email : null,
    role: r.role,
    status: r.status,
    joinedAt: r.joinedAt,
    lastActiveAt: r.lastActiveAt,
    teams: teams.filter((t) => t.userId === r.userId).map((t) => ({ id: t.teamId, name: t.name })),
  }));
}

type Target = { role: Role; status: "active" | "suspended" };

async function guard(ctx: RequestContext, userId: string): Promise<Target | Fail<"NOT_FOUND" | "FORBIDDEN">> {
  const m = await repo.membership(getDb(), ctx.organizationId, userId);
  if (!m) return { ok: false, code: "NOT_FOUND" };
  if (!can(ctx.role, "members.manage") || !canActOn(ctx.role, m.role)) return { ok: false, code: "FORBIDDEN" };
  return { role: m.role, status: m.status };
}

/** G3 / PRD-02 §6.5: an active organization always keeps at least one active Owner. */
async function isLastOwner(q: Tx | ReturnType<typeof getDb>, orgId: string, userId: string) {
  const owners = await repo.activeOwners(q, orgId);
  return owners.length === 1 && owners[0].userId === userId;
}

/**
 * US-4 of PRD-04 and G1–G4: Admins move Members ↔ Admins; only Owners grant or remove Owner, and
 * promotion to Owner needs authentication within the last 10 minutes. Nobody changes their own role
 * except an Owner stepping down while another Owner exists.
 */
export async function changeRole(
  ctx: RequestContext,
  userId: string,
  to: Role,
  lastAuthAt: Date,
): Promise<{ ok: true; eventIds: string[] } | Fail<"NOT_FOUND" | "FORBIDDEN" | "LAST_OWNER" | "REAUTH_REQUIRED" | "UNCHANGED">> {
  const db = getDb();
  const m = await repo.membership(db, ctx.organizationId, userId);
  if (!m) return { ok: false, code: "NOT_FOUND" };
  if (m.role === to) return { ok: false, code: "UNCHANGED" };
  const self = userId === ctx.userId;
  if (self ? !(ctx.role === "owner" && m.role === "owner") : !canChangeRole(ctx.role, m.role, to)) return { ok: false, code: "FORBIDDEN" };
  if (m.role === "owner" && (await isLastOwner(db, ctx.organizationId, userId))) return { ok: false, code: "LAST_OWNER" };
  if (to === "owner" && Date.now() - lastAuthAt.getTime() > REAUTH_WINDOW_MS) return { ok: false, code: "REAUTH_REQUIRED" };
  const eventId = await db.transaction(async (tx) => {
    await repo.setRole(tx, ctx.organizationId, userId, to);
    return publish(tx, orgCtx(ctx), { type: "access.role.changed", subject: { module: "access", type: "member", id: userId }, before: { role: m.role }, after: { role: to } });
  });
  return { ok: true, eventIds: [eventId] };
}

/** US-4 of PRD-03: suspended members keep their grants and teams; they cannot access the organization. */
export async function suspend(ctx: RequestContext, userId: string) {
  return setStatus(ctx, userId, "suspended");
}

export async function reactivate(ctx: RequestContext, userId: string) {
  return setStatus(ctx, userId, "active");
}

async function setStatus(ctx: RequestContext, userId: string, status: "active" | "suspended"): Promise<{ ok: true; eventIds: string[] } | Fail<"NOT_FOUND" | "FORBIDDEN" | "LAST_OWNER" | "UNCHANGED">> {
  if (userId === ctx.userId) return { ok: false, code: "FORBIDDEN" };
  const g = await guard(ctx, userId);
  if ("ok" in g) return g;
  if (g.status === status) return { ok: false, code: "UNCHANGED" };
  const db = getDb();
  if (status === "suspended" && g.role === "owner" && (await isLastOwner(db, ctx.organizationId, userId))) return { ok: false, code: "LAST_OWNER" };
  const eventId = await db.transaction(async (tx) => {
    await repo.setStatus(tx, ctx.organizationId, userId, status);
    return publish(tx, orgCtx(ctx), { type: status === "suspended" ? "membership.member.suspended" : "membership.member.reactivated", subject: { module: "people", type: "member", id: userId } });
  });
  return { ok: true, eventIds: [eventId] };
}

/** Open work per app for the removal wizard (PRD-03 §8.1). */
export async function previewWorkHandover(ctx: RequestContext, userId: string): Promise<{ app: string; count: number }[]> {
  const db = getDb();
  const out: { app: string; count: number }[] = [];
  for (const p of workProviders()) {
    const count = await p.countOpenWork(db, ctx.organizationId, userId);
    if (count) out.push({ app: p.app, count });
  }
  return out;
}

/** A reassignment target must be an active member (other than the person leaving) with access to the app. */
async function validTarget(ctx: RequestContext, app: string, targetId: string, leavingId: string): Promise<boolean> {
  if (targetId === leavingId) return false;
  const m = await repo.membership(getDb(), ctx.organizationId, targetId);
  if (!m || m.status !== "active") return false;
  if (app === "access") return true;
  return (await appAccess(getDb(), { ...ctx, userId: targetId, role: m.role }, app)) === "ok";
}

async function removeWithHandover(tx: Tx, ctx: RequestContext, userId: string, targets: Record<string, string>, type: "membership.member.removed" | "membership.member.left") {
  const bulkOperationId = uuidv7();
  const counts = new Map<string, Record<string, number>>();
  for (const p of workProviders()) {
    const to = targets[p.app];
    const n = await p.reassignOpenWork(tx, ctx.organizationId, userId, to, bulkOperationId);
    if (n) counts.set(to, { ...(counts.get(to) ?? {}), [p.app]: n });
  }
  await repo.deleteMembership(tx, ctx.organizationId, userId);
  const ids = [await publish(tx, orgCtx(ctx), { type, subject: { module: "people", type: "member", id: userId }, data: { reassigned_to: targets } })];
  for (const [to, c] of counts)
    ids.push(await publish(tx, orgCtx(ctx), { type: "membership.work.reassigned", subject: { module: "people", type: "member", id: to }, data: { from_user_id: userId, counts: c }, bulkOperationId }));
  return ids;
}

/**
 * US-3 of PRD-03: removal and every reassignment run in one transaction (R2). Default target per app
 * is the admin performing the removal (R1). Direct grants and team memberships are deleted.
 */
export async function removeMember(
  ctx: RequestContext,
  userId: string,
  targets: Record<string, string> = {},
): Promise<{ ok: true; eventIds: string[] } | Fail<"NOT_FOUND" | "FORBIDDEN" | "LAST_OWNER" | "BAD_TARGET">> {
  if (userId === ctx.userId) return { ok: false, code: "FORBIDDEN" };
  const g = await guard(ctx, userId);
  if ("ok" in g) return g;
  const db = getDb();
  if (g.role === "owner" && (await isLastOwner(db, ctx.organizationId, userId))) return { ok: false, code: "LAST_OWNER" };
  const resolved: Record<string, string> = {};
  for (const p of workProviders()) {
    resolved[p.app] = targets[p.app] ?? ctx.userId;
    if (!(await validTarget(ctx, p.app, resolved[p.app], userId))) return { ok: false, code: "BAD_TARGET" };
  }
  const eventIds = await db.transaction((tx) => removeWithHandover(tx, ctx, userId, resolved, "membership.member.removed"));
  return { ok: true, eventIds };
}

/** "Keluar dari organisasi" (R3): open work goes to the earliest-joined active Owner; the last Owner cannot leave. */
export async function leave(ctx: RequestContext): Promise<{ ok: true; eventIds: string[] } | Fail<"LAST_OWNER">> {
  const db = getDb();
  if (await isLastOwner(db, ctx.organizationId, ctx.userId)) return { ok: false, code: "LAST_OWNER" };
  const owner = (await repo.activeOwners(db, ctx.organizationId)).find((o) => o.userId !== ctx.userId);
  if (!owner) return { ok: false, code: "LAST_OWNER" };
  const targets = Object.fromEntries(workProviders().map((p) => [p.app, owner.userId]));
  const eventIds = await db.transaction((tx) => removeWithHandover(tx, ctx, ctx.userId, targets, "membership.member.left"));
  return { ok: true, eventIds };
}

export async function touchActivity(organizationId: string, userId: string) {
  await repo.touchActive(getDb(), organizationId, userId);
}
