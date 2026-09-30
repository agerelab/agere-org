// Bagikan (PRD-04 v1.5 §8.1) for the two Space containers. A space is "Semua anggota" when the
// organization principal holds a grant. A project either follows its space (access = inherit, its own
// grants add to the space's) or is Terbatas (only its own grants). A project never carries an
// organization grant, so it can never be wider than its space (I1) by construction.
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { memberships, teamMembers, teams, users, type AclLevel } from "@/db/schema";
import type { RequestContext } from "@/lib/context";
import { publish } from "@/modules/events";
import { aclList, saveAcl, whoCanAccess, type Principal } from "@/modules/authz/service";
import { byLevelDesc } from "@/modules/authz/levels";
import { APP, checkProject, checkSpace, projectChain, spaceChain } from "./access";
import * as repo from "./repository";
import { denied, orgCtx, type Fail } from "./shared";

export type ShareTarget = { kind: "space" | "project"; id: string };
export type ShareEntry = { principal: { type: "user" | "team"; id: string }; level: AclLevel; name: string; detail: string };
export type Person = { id: string; name: string; email: string; level: AclLevel; admin: boolean };
export type ShareInfo = {
  kind: "space" | "project";
  name: string;
  spaceName: string;
  canManage: boolean;
  /** Space: the organization holds a grant. Project: it follows its space and that space is open to all. */
  everyone: boolean;
  /** Project only: follows its space (inherit) rather than Terbatas. */
  followsSpace: boolean;
  /** Project only: the space is open to all, so the organization switch may be on (I1). */
  spaceEveryone: boolean;
  entries: ShareEntry[];
  people: Person[];
  options: { users: { id: string; name: string; email: string }[]; teams: { id: string; name: string; members: number }[] };
};

async function load(ctx: RequestContext, target: ShareTarget) {
  const db = getDb();
  if (target.kind === "space") {
    const s = await repo.space(db, ctx.organizationId, target.id);
    if (!s) return { ok: false as const, code: "NOT_FOUND" as const };
    const d = await checkSpace(ctx, "view", s.id);
    if (!d.allow) return { ok: false as const, code: denied(d.reason) };
    return { ok: true as const, level: d.level, space: s, project: null, container: { type: "space.space", id: s.id }, chain: spaceChain(s.id) };
  }
  const p = await repo.project(db, ctx.organizationId, target.id);
  if (!p) return { ok: false as const, code: "NOT_FOUND" as const };
  const d = await checkProject(ctx, "view", p);
  if (!d.allow) return { ok: false as const, code: denied(d.reason) };
  const s = (await repo.space(db, ctx.organizationId, p.spaceId))!;
  return { ok: true as const, level: d.level, space: s, project: p, container: { type: "space.project", id: p.id }, chain: projectChain(p) };
}

/** What the Share dialog shows. Read-only for anyone below manage (§8.2 partial state a). */
export async function shareInfo(ctx: RequestContext, target: ShareTarget): Promise<{ ok: true; info: ShareInfo } | Fail<"NOT_FOUND" | "FORBIDDEN" | "NO_APP_ACCESS">> {
  const l = await load(ctx, target);
  if (!l.ok) return l;
  const db = getDb();
  const [own, spaceAcl, access, members, teamRows] = await Promise.all([
    aclList(db, ctx.organizationId, l.container),
    aclList(db, ctx.organizationId, { type: "space.space", id: l.space.id }),
    whoCanAccess(db, ctx.organizationId, APP, l.chain),
    db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(and(eq(memberships.organizationId, ctx.organizationId), eq(memberships.status, "active"))),
    db.select().from(teams).where(eq(teams.organizationId, ctx.organizationId)),
  ]);
  const counts = teamRows.length
    ? await db.select({ teamId: teamMembers.teamId }).from(teamMembers).where(and(eq(teamMembers.organizationId, ctx.organizationId), inArray(teamMembers.teamId, teamRows.map((t) => t.id))))
    : [];
  const size = (id: string) => counts.filter((c) => c.teamId === id).length;
  const userOf = new Map(members.map((m) => [m.id, m]));
  const teamOf = new Map(teamRows.map((t) => [t.id, t]));
  const entries: ShareEntry[] = own
    .filter((r) => r.principalType !== "org")
    .flatMap((r): ShareEntry[] => {
      if (r.principalType === "user") {
        const u = userOf.get(r.principalId);
        return u ? [{ principal: { type: "user", id: u.id }, level: r.level, name: u.name, detail: u.email }] : [];
      }
      const t = teamOf.get(r.principalId);
      return t ? [{ principal: { type: "team", id: t.id }, level: r.level, name: t.name, detail: String(size(t.id)) }] : [];
    });
  const spaceEveryone = spaceAcl.some((r) => r.principalType === "org");
  const followsSpace = l.project ? l.project.access === "inherit" : false;
  const people = access
    .map((a) => ({ id: a.userId, name: userOf.get(a.userId)?.name ?? "—", email: userOf.get(a.userId)?.email ?? "", level: a.level as AclLevel, admin: a.override }))
    .sort((a, b) => byLevelDesc(a.level, b.level) || a.name.localeCompare(b.name));
  return {
    ok: true,
    info: {
      kind: target.kind,
      name: l.project?.name ?? l.space.name,
      spaceName: l.space.name,
      canManage: l.level === "manage",
      everyone: l.project ? followsSpace && spaceEveryone : own.some((r) => r.principalType === "org"),
      followsSpace,
      spaceEveryone,
      entries,
      people,
      options: {
        users: members.map((m) => ({ id: m.id, name: m.name, email: m.email })).sort((a, b) => a.name.localeCompare(b.name)),
        teams: teamRows.map((t) => ({ id: t.id, name: t.name, members: size(t.id) })).sort((a, b) => a.name.localeCompare(b.name)),
      },
    },
  };
}

export type ShareInput = {
  /** Space: "Semua anggota". Project: follow the space (only allowed on when the space is open to all, or to keep following a restricted space). */
  everyone: boolean;
  entries: { principal: { type: "user" | "team"; id: string }; level: AclLevel }[];
};

/**
 * "Simpan akses" (manage). I3: at least one user or team keeps manage ("Minimal satu orang harus bisa
 * mengelola."). A project's own grants never include the organization (I1).
 */
export async function saveSharing(
  ctx: RequestContext,
  target: ShareTarget,
  input: ShareInput & { followSpace?: boolean },
): Promise<{ ok: true; eventIds: string[] } | Fail<"NOT_FOUND" | "FORBIDDEN" | "NO_APP_ACCESS" | "INVALID" | "NO_MANAGER">> {
  const l = await load(ctx, target);
  if (!l.ok) return l;
  if (l.level !== "manage") return { ok: false, code: "FORBIDDEN" };
  const db = getDb();
  const seen = new Set<string>();
  for (const e of input.entries) {
    const key = `${e.principal.type}:${e.principal.id}`;
    if (seen.has(key) || !["view", "edit", "manage"].includes(e.level) || !["user", "team"].includes(e.principal.type)) return { ok: false, code: "INVALID" };
    seen.add(key);
  }
  const userIds = input.entries.filter((e) => e.principal.type === "user").map((e) => e.principal.id);
  const teamIds = input.entries.filter((e) => e.principal.type === "team").map((e) => e.principal.id);
  const [okUsers, okTeams] = await Promise.all([
    userIds.length ? db.select({ id: memberships.userId }).from(memberships).where(and(eq(memberships.organizationId, ctx.organizationId), inArray(memberships.userId, userIds))) : [],
    teamIds.length ? db.select({ id: teams.id }).from(teams).where(and(eq(teams.organizationId, ctx.organizationId), inArray(teams.id, teamIds))) : [],
  ]);
  if (okUsers.length !== userIds.length || okTeams.length !== teamIds.length) return { ok: false, code: "INVALID" };

  const rows: { principal: Principal; level: AclLevel }[] = input.entries.map((e) => ({ principal: e.principal, level: e.level }));
  if (l.project) {
    const spaceEveryone = (await aclList(db, ctx.organizationId, { type: "space.space", id: l.space.id })).some((r) => r.principalType === "org");
    // The organization switch may only be on when the space is open to all (I1); otherwise the
    // project can still follow its (restricted) space through the advanced preset.
    if (input.everyone && !spaceEveryone) return { ok: false, code: "INVALID" };
    const follow = input.followSpace ?? input.everyone;
    const result = await db.transaction(async (tx) => {
      const acl = await saveAcl(tx, ctx, l.container, rows);
      if (!acl.ok) return null;
      const ids = [acl.eventId];
      const access = follow ? "inherit" : "restricted";
      if (access !== l.project!.access) {
        await repo.updateProject(tx, ctx.organizationId, l.project!.id, { access });
        ids.push(
          await publish(tx, orgCtx(ctx), {
            type: "space.project.updated",
            subject: { module: "space", type: "project", id: l.project!.id, container: { type: "space", id: l.space.id } },
            data: { before: { access: l.project!.access }, after: { access } },
          }),
        );
      }
      return ids;
    });
    return result ? { ok: true, eventIds: result } : { ok: false, code: "NO_MANAGER" };
  }

  const current = await aclList(db, ctx.organizationId, l.container);
  const orgLevel = current.find((r) => r.principalType === "org")?.level ?? "edit";
  if (input.everyone) rows.push({ principal: { type: "org", id: ctx.organizationId }, level: orgLevel });
  const result = await db.transaction(async (tx) => {
    const acl = await saveAcl(tx, ctx, l.container, rows);
    return acl.ok ? [acl.eventId] : null;
  });
  return result ? { ok: true, eventIds: result } : { ok: false, code: "NO_MANAGER" };
}
