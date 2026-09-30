import { and, eq, inArray, or, sql } from "drizzle-orm";
import { aclEntries, appGrants, appRegistry, memberships, orgApps, teamMembers, type PrincipalType } from "@/db/schema";
import type { Db, Tx } from "@/db/client";

type Q = Db | Tx;
export type Principal = { type: PrincipalType; id: string };
/** An ACL container. `inherit`: its own grants add to its parent's instead of replacing them. */
export type Container = { type: string; id: string; inherit?: boolean };
export type AclRow = typeof aclEntries.$inferSelect;

export async function apps(q: Q) {
  return q.select().from(appRegistry).orderBy(appRegistry.position);
}

export async function orgAppStates(q: Q, orgId: string) {
  return q.select().from(orgApps).where(eq(orgApps.organizationId, orgId));
}

export async function appEnabled(q: Q, orgId: string, appId: string): Promise<boolean> {
  const [row] = await q.select().from(orgApps).where(and(eq(orgApps.organizationId, orgId), eq(orgApps.appId, appId)));
  return !!row?.enabled;
}

export async function setAppEnabled(q: Q, orgId: string, appId: string, enabled: boolean) {
  await q
    .insert(orgApps)
    .values({ organizationId: orgId, appId, enabled })
    .onConflictDoUpdate({ target: [orgApps.organizationId, orgApps.appId], set: { enabled, updatedAt: new Date() } });
}

export async function teamIdsOf(q: Q, orgId: string, userId: string): Promise<string[]> {
  const rows = await q.select({ id: teamMembers.teamId }).from(teamMembers).where(and(eq(teamMembers.organizationId, orgId), eq(teamMembers.userId, userId)));
  return rows.map((r) => r.id);
}

/** Principals a user matches in an organization: themselves, each of their teams, the organization. */
export async function principalsOf(q: Q, orgId: string, userId: string): Promise<Principal[]> {
  const teamIds = await teamIdsOf(q, orgId, userId);
  return [{ type: "user", id: userId }, ...teamIds.map((id) => ({ type: "team" as const, id })), { type: "org", id: orgId }];
}

const principalMatch = (table: typeof appGrants | typeof aclEntries, ps: Principal[]) =>
  or(...ps.map((p) => and(eq(table.principalType, p.type), eq(table.principalId, p.id))));

export async function hasAppGrant(q: Q, orgId: string, appId: string, ps: Principal[]): Promise<boolean> {
  const [row] = await q
    .select({ n: sql<number>`1` })
    .from(appGrants)
    .where(and(eq(appGrants.organizationId, orgId), eq(appGrants.appId, appId), principalMatch(appGrants, ps)))
    .limit(1);
  return !!row;
}

export async function grantsFor(q: Q, orgId: string, appId?: string) {
  return q
    .select()
    .from(appGrants)
    .where(appId ? and(eq(appGrants.organizationId, orgId), eq(appGrants.appId, appId)) : eq(appGrants.organizationId, orgId));
}

export async function insertGrant(q: Q, g: typeof appGrants.$inferInsert) {
  await q.insert(appGrants).values(g).onConflictDoNothing();
}

export async function deleteGrant(q: Q, orgId: string, appId: string, p: Principal): Promise<boolean> {
  const rows = await q
    .delete(appGrants)
    .where(and(eq(appGrants.organizationId, orgId), eq(appGrants.appId, appId), eq(appGrants.principalType, p.type), eq(appGrants.principalId, p.id)))
    .returning({ id: appGrants.principalId });
  return rows.length > 0;
}

export async function deleteGrantsOfPrincipal(q: Q, orgId: string, p: Principal) {
  await q.delete(appGrants).where(and(eq(appGrants.organizationId, orgId), eq(appGrants.principalType, p.type), eq(appGrants.principalId, p.id)));
}

export async function aclOf(q: Q, orgId: string, c: Container): Promise<AclRow[]> {
  return q
    .select()
    .from(aclEntries)
    .where(and(eq(aclEntries.organizationId, orgId), eq(aclEntries.containerType, c.type), eq(aclEntries.containerId, c.id)));
}

export async function replaceAcl(tx: Tx, orgId: string, c: Container, rows: { principal: Principal; level: AclRow["level"] }[]) {
  await tx.delete(aclEntries).where(and(eq(aclEntries.organizationId, orgId), eq(aclEntries.containerType, c.type), eq(aclEntries.containerId, c.id)));
  if (rows.length)
    await tx.insert(aclEntries).values(
      rows.map((r) => ({ organizationId: orgId, containerType: c.type, containerId: c.id, principalType: r.principal.type, principalId: r.principal.id, level: r.level })),
    );
}

/** ACL rows naming one principal (for I3 and I4). */
export async function aclRowsOfPrincipal(q: Q, orgId: string, p: Principal): Promise<AclRow[]> {
  return q.select().from(aclEntries).where(and(eq(aclEntries.organizationId, orgId), eq(aclEntries.principalType, p.type), eq(aclEntries.principalId, p.id)));
}

export async function deleteAclRowsOfPrincipal(q: Q, orgId: string, p: Principal) {
  await q.delete(aclEntries).where(and(eq(aclEntries.organizationId, orgId), eq(aclEntries.principalType, p.type), eq(aclEntries.principalId, p.id)));
}

export async function upsertAclRow(q: Q, orgId: string, c: Container, p: Principal, level: AclRow["level"]) {
  await q
    .insert(aclEntries)
    .values({ organizationId: orgId, containerType: c.type, containerId: c.id, principalType: p.type, principalId: p.id, level })
    .onConflictDoUpdate({ target: [aclEntries.organizationId, aclEntries.containerType, aclEntries.containerId, aclEntries.principalType, aclEntries.principalId], set: { level } });
}

/** Active members of an organization, with role; the population app and ACL impact is computed over. */
export async function activeMembers(q: Q, orgId: string) {
  return q
    .select({ userId: memberships.userId, role: memberships.role })
    .from(memberships)
    .where(and(eq(memberships.organizationId, orgId), eq(memberships.status, "active")));
}

export async function teamMemberRows(q: Q, orgId: string, teamIds: string[]) {
  if (!teamIds.length) return [];
  return q.select().from(teamMembers).where(and(eq(teamMembers.organizationId, orgId), inArray(teamMembers.teamId, teamIds)));
}

/** Every ACL row of an organization for the given container ids (one query for list pages). */
export async function aclOfMany(q: Q, orgId: string, containerIds: string[]): Promise<AclRow[]> {
  if (!containerIds.length) return [];
  return q.select().from(aclEntries).where(and(eq(aclEntries.organizationId, orgId), inArray(aclEntries.containerId, containerIds)));
}
