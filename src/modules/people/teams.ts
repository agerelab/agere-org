// Teams (PRD-03 §6.4): unique name per organization (case-insensitive), 1–50 characters; a principal
// in app grants and ACLs; deleting a team removes its grants (I4) and unassigns its open items.
import "@/modules/registry";
import { getDb } from "@/db/client";
import { uuidv7 } from "@/lib/ids";
import type { RequestContext } from "@/lib/context";
import { publish } from "@/modules/events";
import { can } from "@/modules/authz/matrix";
import { removeTeamGrants } from "@/modules/authz/service";
import { workProviders } from "@/modules/authz/work";
import * as repo from "./repository";
import { orgCtx, type Fail } from "./shared";

const validName = (name: string) => name.trim().length >= 1 && name.trim().length <= 50;

export async function listTeams(ctx: RequestContext) {
  const rows = await repo.teamList(getDb(), ctx.organizationId);
  return rows.map((r) => ({ id: r.team.id, name: r.team.name, members: r.members }));
}

export async function getTeam(ctx: RequestContext, id: string) {
  const db = getDb();
  const team = await repo.team(db, ctx.organizationId, id);
  if (!team) return null;
  return { id: team.id, name: team.name, memberIds: await repo.teamMemberIds(db, ctx.organizationId, id) };
}

export async function createTeam(ctx: RequestContext, name: string): Promise<{ ok: true; id: string; eventIds: string[] } | Fail<"FORBIDDEN" | "INVALID" | "TAKEN">> {
  if (!can(ctx.role, "teams.manage")) return { ok: false, code: "FORBIDDEN" };
  if (!validName(name)) return { ok: false, code: "INVALID" };
  const db = getDb();
  if (await repo.teamByName(db, ctx.organizationId, name.trim())) return { ok: false, code: "TAKEN" };
  const id = uuidv7();
  const eventId = await db.transaction(async (tx) => {
    await repo.insertTeam(tx, { organizationId: ctx.organizationId, id, name: name.trim(), createdBy: ctx.userId });
    return publish(tx, orgCtx(ctx), { type: "team.team.created", subject: { module: "people", type: "team", id }, data: { name: name.trim() } });
  });
  return { ok: true, id, eventIds: [eventId] };
}

export async function renameTeam(ctx: RequestContext, id: string, name: string): Promise<{ ok: true; eventIds: string[] } | Fail<"FORBIDDEN" | "INVALID" | "TAKEN" | "NOT_FOUND">> {
  if (!can(ctx.role, "teams.manage")) return { ok: false, code: "FORBIDDEN" };
  if (!validName(name)) return { ok: false, code: "INVALID" };
  const db = getDb();
  const team = await repo.team(db, ctx.organizationId, id);
  if (!team) return { ok: false, code: "NOT_FOUND" };
  const clash = await repo.teamByName(db, ctx.organizationId, name.trim());
  if (clash && clash.id !== id) return { ok: false, code: "TAKEN" };
  const eventId = await db.transaction(async (tx) => {
    await repo.renameTeam(tx, ctx.organizationId, id, name.trim());
    return publish(tx, orgCtx(ctx), { type: "team.team.renamed", subject: { module: "people", type: "team", id }, before: { name: team.name }, after: { name: name.trim() } });
  });
  return { ok: true, eventIds: [eventId] };
}

/** Counts shown in the delete confirmation (PRD-03 §6.4). */
export async function teamDeletionImpact(ctx: RequestContext, id: string) {
  const db = getDb();
  let items = 0;
  for (const p of workProviders()) if (p.countTeamWork) items += await p.countTeamWork(db, ctx.organizationId, id);
  return { members: (await repo.teamMemberIds(db, ctx.organizationId, id)).length, items };
}

/** US-6: grants removed (I4), each affected container keeps a manager (I3), items become unassigned. */
export async function deleteTeam(ctx: RequestContext, id: string): Promise<{ ok: true; eventIds: string[] } | Fail<"FORBIDDEN" | "NOT_FOUND">> {
  if (!can(ctx.role, "teams.manage")) return { ok: false, code: "FORBIDDEN" };
  const db = getDb();
  const team = await repo.team(db, ctx.organizationId, id);
  if (!team) return { ok: false, code: "NOT_FOUND" };
  const eventId = await db.transaction(async (tx) => {
    for (const p of workProviders()) if (p.unassignTeam) await p.unassignTeam(tx, ctx.organizationId, id);
    await removeTeamGrants(tx, ctx.organizationId, id, ctx.userId);
    await repo.deleteTeam(tx, ctx.organizationId, id);
    return publish(tx, orgCtx(ctx), { type: "team.team.deleted", subject: { module: "people", type: "team", id }, data: { name: team.name } });
  });
  return { ok: true, eventIds: [eventId] };
}

/** Replaces a team's members with `userIds` (active members only); one event per change. */
export async function setTeamMembers(ctx: RequestContext, id: string, userIds: string[]): Promise<{ ok: true; eventIds: string[] } | Fail<"FORBIDDEN" | "NOT_FOUND" | "INVALID">> {
  if (!can(ctx.role, "teams.manage")) return { ok: false, code: "FORBIDDEN" };
  const db = getDb();
  if (!(await repo.team(db, ctx.organizationId, id))) return { ok: false, code: "NOT_FOUND" };
  const members = await repo.memberRows(db, ctx.organizationId);
  const wanted = [...new Set(userIds)];
  if (wanted.some((u) => !members.some((m) => m.userId === u && m.status === "active"))) return { ok: false, code: "INVALID" };
  const current = await repo.teamMemberIds(db, ctx.organizationId, id);
  const add = wanted.filter((u) => !current.includes(u));
  const remove = current.filter((u) => !wanted.includes(u));
  const eventIds = await db.transaction(async (tx) => {
    await repo.addTeamMembers(tx, ctx.organizationId, id, add);
    await repo.removeTeamMembers(tx, ctx.organizationId, id, remove);
    const ids: string[] = [];
    for (const u of add) ids.push(await publish(tx, orgCtx(ctx), { type: "team.member.added", subject: { module: "people", type: "team", id }, data: { user_id: u } }));
    for (const u of remove) ids.push(await publish(tx, orgCtx(ctx), { type: "team.member.removed", subject: { module: "people", type: "team", id }, data: { user_id: u } }));
    return ids;
  });
  return { ok: true, eventIds };
}
