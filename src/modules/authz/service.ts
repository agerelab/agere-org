// authz (PRD-04 §6): four layers, evaluated in order, deny wins. Every check reads Postgres (E3: no
// decision cache in release 1), so a committed change is effective on the next request.
import { getDb, type Db, type Tx } from "@/db/client";
import type { RequestContext } from "@/lib/context";
import { publish } from "@/modules/events";
import type { AclLevel } from "@/db/schema";
import { atLeast, byLevelDesc, maxLevel, type Level } from "./levels";
import { isAdminRole } from "./matrix";
import * as repo from "./repository";
import { registerWorkProvider } from "./work";

export type { Container, Principal } from "./repository";
export type Reason = "NOT_MEMBER" | "APP_DISABLED" | "NO_APP_ACCESS" | "NOT_FOUND" | "FORBIDDEN" | "UNAVAILABLE";
export type Decision = { allow: true; level: Level; override: boolean } | { allow: false; reason: Reason; level: Level };
export const DEFAULT_APPS = ["space"] as const;

type Q = Db | Tx;

/** L3 (PRD-04 §6.5): the app is enabled AND the user has access; Owners and Admins have it by default. */
export async function appAccess(q: Q, ctx: RequestContext, appId: string): Promise<"ok" | "APP_DISABLED" | "NO_APP_ACCESS"> {
  if (!(await repo.appEnabled(q, ctx.organizationId, appId))) return "APP_DISABLED";
  if (isAdminRole(ctx.role)) return "ok";
  const ps = await repo.principalsOf(q, ctx.organizationId, ctx.userId);
  return (await repo.hasAppGrant(q, ctx.organizationId, appId, ps)) ? "ok" : "NO_APP_ACCESS";
}

/**
 * Effective level on a container chain, innermost first ([project, space]). A container with its own
 * ACL decides (a restricted project narrows its space, I1), unless it is marked `inherit`, in which
 * case its grants add to its parent's. The level is the maximum over every grant matching the user
 * directly, through a team, or through the organization (§6.3).
 */
export async function effectiveLevel(q: Q, ctx: Pick<RequestContext, "organizationId" | "userId">, chain: repo.Container[]): Promise<Level> {
  const ps = await repo.principalsOf(q, ctx.organizationId, ctx.userId);
  const rows = await repo.aclOfMany(q, ctx.organizationId, chain.map((c) => c.id));
  return levelFromRows(rows, ps, chain);
}

/** Pure part of effectiveLevel, for list pages that load every row once. */
export function levelFromRows(rows: repo.AclRow[], ps: repo.Principal[], chain: repo.Container[]): Level {
  const found: Level[] = [];
  for (const c of chain) {
    const own = rows.filter((r) => r.containerType === c.type && r.containerId === c.id);
    found.push(...own.filter((r) => ps.some((p) => p.type === r.principalType && p.id === r.principalId)).map((r) => r.level));
    if (own.length && !c.inherit) break;
  }
  return maxLevel(found);
}

/** Levels for many chains at once (space panel, project cards), in two queries. */
export async function levelsFor(q: Q, ctx: Pick<RequestContext, "organizationId" | "userId">, chains: repo.Container[][]): Promise<Level[]> {
  const ps = await repo.principalsOf(q, ctx.organizationId, ctx.userId);
  const ids = [...new Set(chains.flat().map((c) => c.id))];
  const rows = await repo.aclOfMany(q, ctx.organizationId, ids);
  return chains.map((chain) => levelFromRows(rows, ps, chain));
}

/**
 * The decision algorithm of PRD-04 §6.1 for an action needing `need` on a resource in `app`, whose
 * containers are `chain`. L1–L2 are established by requireOrg (membership is re-read every request).
 * Fail-closed (E5): any error is UNAVAILABLE, never allow.
 */
export async function check(ctx: RequestContext, need: AclLevel, resource: { app: string; chain: repo.Container[] }, q: Q = getDb()): Promise<Decision> {
  try {
    const app = await appAccess(q, ctx, resource.app);
    if (app !== "ok") return { allow: false, reason: app, level: "none" };
    const level = await effectiveLevel(q, ctx, resource.chain);
    if (isAdminRole(ctx.role)) return { allow: true, level: "manage", override: level === "none" };
    if (level === "none") return { allow: false, reason: "NOT_FOUND", level };
    if (!atLeast(level, need)) return { allow: false, reason: "FORBIDDEN", level };
    return { allow: true, level, override: false };
  } catch (e) {
    console.error("[authz] check failed", e);
    return { allow: false, reason: "UNAVAILABLE", level: "none" };
  }
}

/**
 * Every active member who can open a resource, with the level and whether it comes only from the
 * governance override (Owner/Admin without a grant). Loads app grants, ACL rows and team membership
 * once; used by Bagikan and the project Members tab so both count the same people.
 */
export async function whoCanAccess(q: Q, organizationId: string, app: string, chain: repo.Container[]) {
  const [enabled, members, grants, rows] = await Promise.all([
    repo.appEnabled(q, organizationId, app),
    repo.activeMembers(q, organizationId),
    repo.grantsFor(q, organizationId, app),
    repo.aclOfMany(q, organizationId, chain.map((c) => c.id)),
  ]);
  if (!enabled) return [];
  const teamIds = [...new Set([...grants, ...rows].filter((g) => g.principalType === "team").map((g) => g.principalId))];
  const teamRows = await repo.teamMemberRows(q, organizationId, teamIds);
  const out: { userId: string; role: string; level: Level; override: boolean }[] = [];
  for (const m of members) {
    const ps: repo.Principal[] = [{ type: "user", id: m.userId }, ...teamRows.filter((t) => t.userId === m.userId).map((t) => ({ type: "team" as const, id: t.teamId })), { type: "org", id: organizationId }];
    const admin = isAdminRole(m.role);
    const hasApp = admin || grants.some((g) => ps.some((p) => p.type === g.principalType && p.id === g.principalId));
    if (!hasApp) continue;
    const level = levelFromRows(rows, ps, chain);
    if (level !== "none") out.push({ userId: m.userId, role: m.role, level, override: false });
    else if (admin) out.push({ userId: m.userId, role: m.role, level: "manage", override: true });
  }
  return out;
}

// ---------- organization defaults ----------

/** New organizations: Space enabled, and every member has it (the "Semua anggota" grant). */
export async function setupOrganizationApps(tx: Tx, organizationId: string, createdBy: string) {
  for (const app of DEFAULT_APPS) {
    await repo.setAppEnabled(tx, organizationId, app, true);
    await repo.insertGrant(tx, { organizationId, appId: app, principalType: "org", principalId: organizationId, createdBy });
  }
}

// ---------- administration (Organisasi › Aplikasi) ----------

const orgCtx = (ctx: RequestContext) => ({ scope: "organization" as const, organizationId: ctx.organizationId, actor: { type: "user" as const, userId: ctx.userId }, requestId: ctx.requestId });

export async function setAppEnabled(ctx: RequestContext, appId: string, enabled: boolean): Promise<string[]> {
  return getDb().transaction(async (tx) => {
    const before = await repo.appEnabled(tx, ctx.organizationId, appId);
    if (before === enabled) return [];
    await repo.setAppEnabled(tx, ctx.organizationId, appId, enabled);
    return [
      await publish(tx, orgCtx(ctx), {
        type: enabled ? "access.app.enabled" : "access.app.disabled",
        subject: { module: "access", type: "app", id: appId },
        before: { enabled: before },
        after: { enabled },
      }),
    ];
  });
}

export async function grantApp(ctx: RequestContext, appId: string, principal: repo.Principal): Promise<string[]> {
  return getDb().transaction(async (tx) => {
    await repo.insertGrant(tx, { organizationId: ctx.organizationId, appId, principalType: principal.type, principalId: principal.id, createdBy: ctx.userId });
    return [
      await publish(tx, orgCtx(ctx), {
        type: "access.app_grant.created",
        subject: { module: "access", type: "app_grant", id: `${appId}:${principal.type}:${principal.id}` },
        data: { app: appId, principal_type: principal.type, principal_id: principal.id },
      }),
    ];
  });
}

/** Members (not Owner/Admin) who have `appId` only through `principal`: they lose access if it goes. */
export async function whoLosesAppAccess(ctx: RequestContext, appId: string, principal: repo.Principal): Promise<string[]> {
  const db = getDb();
  const members = (await repo.activeMembers(db, ctx.organizationId)).filter((m) => m.role === "member");
  const others = (await repo.grantsFor(db, ctx.organizationId, appId)).filter((g) => !(g.principalType === principal.type && g.principalId === principal.id));
  const losing: string[] = [];
  for (const m of members) {
    const ps = await repo.principalsOf(db, ctx.organizationId, m.userId);
    const had = ps.some((p) => p.type === principal.type && p.id === principal.id);
    const keeps = others.some((g) => ps.some((p) => p.type === g.principalType && p.id === g.principalId));
    if (had && !keeps) losing.push(m.userId);
  }
  return losing;
}

export async function revokeApp(ctx: RequestContext, appId: string, principal: repo.Principal): Promise<string[]> {
  return getDb().transaction(async (tx) => {
    if (!(await repo.deleteGrant(tx, ctx.organizationId, appId, principal))) return [];
    return [
      await publish(tx, orgCtx(ctx), {
        type: "access.app_grant.revoked",
        subject: { module: "access", type: "app_grant", id: `${appId}:${principal.type}:${principal.id}` },
        data: { app: appId, principal_type: principal.type, principal_id: principal.id },
      }),
    ];
  });
}

export async function appsOverview(ctx: RequestContext) {
  const db = getDb();
  const [apps, states, grants, members] = await Promise.all([
    repo.apps(db),
    repo.orgAppStates(db, ctx.organizationId),
    repo.grantsFor(db, ctx.organizationId),
    repo.activeMembers(db, ctx.organizationId),
  ]);
  const teamIds = [...new Set(grants.filter((g) => g.principalType === "team").map((g) => g.principalId))];
  const teamRows = await repo.teamMemberRows(db, ctx.organizationId, teamIds);
  return apps.map((app) => {
    const g = grants.filter((x) => x.appId === app.id);
    const everyone = g.some((x) => x.principalType === "org");
    const withAccess = members.filter(
      (m) =>
        isAdminRole(m.role) ||
        everyone ||
        g.some((x) => (x.principalType === "user" && x.principalId === m.userId) || (x.principalType === "team" && teamRows.some((t) => t.teamId === x.principalId && t.userId === m.userId))),
    ).length;
    return { id: app.id, name: app.name, enabled: !!states.find((s) => s.appId === app.id)?.enabled, everyone, members: withAccess, total: members.length };
  });
}

// ---------- resource ACL (§6.3–6.4) ----------

export type AclInput = { principal: repo.Principal; level: AclLevel }[];

/**
 * Replaces a container's ACL. I3: a Restricted/Private container keeps at least one `manage` holder
 * that is a user or team. Publishes access.acl.changed with principal ids only.
 */
export async function saveAcl(tx: Tx, ctx: RequestContext, container: repo.Container, entries: AclInput): Promise<{ ok: true; eventId: string } | { ok: false; code: "NO_MANAGER" }> {
  if (!entries.some((e) => e.level === "manage" && e.principal.type !== "org")) return { ok: false, code: "NO_MANAGER" };
  const before = await repo.aclOf(tx, ctx.organizationId, container);
  await repo.replaceAcl(tx, ctx.organizationId, container, entries);
  const key = (type: string, id: string, level: string) => `${type}:${id}:${level}`;
  const eventId = await publish(tx, orgCtx(ctx), {
    type: "access.acl.changed",
    subject: { module: "access", type: container.type, id: container.id },
    before: { entries: before.map((r) => key(r.principalType, r.principalId, r.level)).sort() },
    after: { entries: entries.map((e) => key(e.principal.type, e.principal.id, e.level)).sort() },
  });
  return { ok: true, eventId };
}

export async function aclList(q: Q, organizationId: string, container: repo.Container) {
  return (await repo.aclOf(q, organizationId, container)).sort((a, b) => byLevelDesc(a.level, b.level));
}

// ---------- removals (PRD-03 §6.1, PRD-04 I3/I4) ----------

/** A removed member's direct grants go (PRD-03 §6.1); containers they alone managed pass to `to` (I3). */
export async function removeUserGrants(tx: Tx, organizationId: string, userId: string, to: string) {
  const user = { type: "user" as const, id: userId };
  for (const row of await repo.aclRowsOfPrincipal(tx, organizationId, user)) {
    if (row.level !== "manage") continue;
    const c = { type: row.containerType, id: row.containerId };
    const managers = (await repo.aclOf(tx, organizationId, c)).filter((r) => r.level === "manage" && !(r.principalType === "user" && r.principalId === userId));
    if (!managers.length) await repo.upsertAclRow(tx, organizationId, c, { type: "user", id: to }, "manage");
  }
  await repo.deleteAclRowsOfPrincipal(tx, organizationId, user);
  await repo.deleteGrantsOfPrincipal(tx, organizationId, user);
}

/** I4: a deleted team's grants go; containers it alone managed pass to `to` (I3). */
export async function removeTeamGrants(tx: Tx, organizationId: string, teamId: string, to: string) {
  const team = { type: "team" as const, id: teamId };
  for (const row of await repo.aclRowsOfPrincipal(tx, organizationId, team)) {
    if (row.level !== "manage") continue;
    const c = { type: row.containerType, id: row.containerId };
    const managers = (await repo.aclOf(tx, organizationId, c)).filter((r) => r.level === "manage" && !(r.principalType === "team" && r.principalId === teamId));
    if (!managers.length) await repo.upsertAclRow(tx, organizationId, c, { type: "user", id: to }, "manage");
  }
  await repo.deleteAclRowsOfPrincipal(tx, organizationId, team);
  await repo.deleteGrantsOfPrincipal(tx, organizationId, team);
}

/** Count of containers where the user is the last direct `manage` holder (shown as "Akses" in the wizard). */
async function lastManagerCount(q: Q, organizationId: string, userId: string): Promise<number> {
  let n = 0;
  for (const row of await repo.aclRowsOfPrincipal(q, organizationId, { type: "user", id: userId })) {
    if (row.level !== "manage") continue;
    const managers = (await repo.aclOf(q, organizationId, { type: row.containerType, id: row.containerId })).filter(
      (r) => r.level === "manage" && !(r.principalType === "user" && r.principalId === userId),
    );
    if (!managers.length) n++;
  }
  return n;
}

registerWorkProvider({
  app: "access",
  countOpenWork: lastManagerCount,
  async reassignOpenWork(tx, organizationId, fromUserId, toUserId) {
    const n = await lastManagerCount(tx, organizationId, fromUserId);
    await removeUserGrants(tx, organizationId, fromUserId, toUserId);
    return n;
  },
});
