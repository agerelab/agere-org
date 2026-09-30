import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { invitations, memberships, organizations, teamMembers, teams, users } from "@/db/schema";
import type { Db, Tx } from "@/db/client";
import type { Role } from "@/lib/context";

type Q = Db | Tx;
export type InvitationRow = typeof invitations.$inferSelect;
export type TeamRow = typeof teams.$inferSelect;

// ---------- members ----------
export async function memberRows(q: Q, orgId: string) {
  return q
    .select({
      userId: memberships.userId,
      role: memberships.role,
      status: memberships.status,
      joinedAt: memberships.joinedAt,
      lastActiveAt: memberships.lastActiveAt,
      name: users.name,
      email: users.email,
      title: users.title,
      avatarUpdatedAt: users.avatarUpdatedAt,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.organizationId, orgId))
    .orderBy(asc(users.name));
}

export async function membership(q: Q, orgId: string, userId: string) {
  const [row] = await q.select().from(memberships).where(and(eq(memberships.organizationId, orgId), eq(memberships.userId, userId)));
  return row;
}

export async function activeOwners(q: Q, orgId: string) {
  return q
    .select({ userId: memberships.userId, joinedAt: memberships.joinedAt })
    .from(memberships)
    .where(and(eq(memberships.organizationId, orgId), eq(memberships.role, "owner"), eq(memberships.status, "active")))
    .orderBy(asc(memberships.joinedAt));
}

export async function setRole(q: Q, orgId: string, userId: string, role: Role) {
  await q.update(memberships).set({ role }).where(and(eq(memberships.organizationId, orgId), eq(memberships.userId, userId)));
}

export async function setStatus(q: Q, orgId: string, userId: string, status: "active" | "suspended") {
  await q.update(memberships).set({ status }).where(and(eq(memberships.organizationId, orgId), eq(memberships.userId, userId)));
}

export async function deleteMembership(q: Q, orgId: string, userId: string) {
  await q.delete(memberships).where(and(eq(memberships.organizationId, orgId), eq(memberships.userId, userId)));
  await q.delete(teamMembers).where(and(eq(teamMembers.organizationId, orgId), eq(teamMembers.userId, userId)));
}

export async function insertMembership(q: Q, m: typeof memberships.$inferInsert) {
  await q.insert(memberships).values(m).onConflictDoNothing();
}

export async function touchActive(q: Q, orgId: string, userId: string) {
  await q
    .update(memberships)
    .set({ lastActiveAt: new Date() })
    .where(and(eq(memberships.organizationId, orgId), eq(memberships.userId, userId), sql`(${memberships.lastActiveAt} IS NULL OR ${memberships.lastActiveAt} < now() - interval '1 hour')`));
}

// ---------- invitations ----------
export async function pendingInvitationFor(q: Q, orgId: string, email: string) {
  const [row] = await q.select().from(invitations).where(and(eq(invitations.organizationId, orgId), eq(invitations.email, email), eq(invitations.status, "pending")));
  return row;
}

export async function invitation(q: Q, orgId: string, id: string) {
  const [row] = await q.select().from(invitations).where(and(eq(invitations.organizationId, orgId), eq(invitations.id, id)));
  return row;
}

export async function invitationByTokenHash(q: Q, tokenHash: string) {
  const [row] = await q
    .select({ invitation: invitations, org: organizations })
    .from(invitations)
    .innerJoin(organizations, eq(organizations.id, invitations.organizationId))
    .where(eq(invitations.tokenHash, tokenHash));
  return row;
}

export async function pendingInvitations(q: Q, orgId: string) {
  return q
    .select({ invitation: invitations, inviter: users.name })
    .from(invitations)
    .innerJoin(users, eq(users.id, invitations.invitedBy))
    .where(and(eq(invitations.organizationId, orgId), eq(invitations.status, "pending")))
    .orderBy(asc(invitations.email));
}

export async function insertInvitation(q: Q, row: typeof invitations.$inferInsert) {
  await q.insert(invitations).values(row);
}

export async function updateInvitation(q: Q, orgId: string, id: string, set: Partial<typeof invitations.$inferInsert>) {
  await q.update(invitations).set({ ...set, updatedAt: new Date() }).where(and(eq(invitations.organizationId, orgId), eq(invitations.id, id)));
}

// ---------- teams ----------
export async function teamList(q: Q, orgId: string) {
  return q
    .select({ team: teams, members: sql<number>`(select count(*)::int from team_members tm where tm.organization_id = ${teams.organizationId} and tm.team_id = ${teams.id})` })
    .from(teams)
    .where(eq(teams.organizationId, orgId))
    .orderBy(asc(teams.name));
}

export async function team(q: Q, orgId: string, id: string) {
  const [row] = await q.select().from(teams).where(and(eq(teams.organizationId, orgId), eq(teams.id, id)));
  return row;
}

export async function teamByName(q: Q, orgId: string, name: string) {
  const [row] = await q.select().from(teams).where(and(eq(teams.organizationId, orgId), sql`lower(${teams.name}) = lower(${name})`));
  return row;
}

export async function insertTeam(q: Q, row: typeof teams.$inferInsert) {
  await q.insert(teams).values(row);
}

export async function renameTeam(q: Q, orgId: string, id: string, name: string) {
  await q.update(teams).set({ name, updatedAt: new Date() }).where(and(eq(teams.organizationId, orgId), eq(teams.id, id)));
}

export async function deleteTeam(q: Q, orgId: string, id: string) {
  await q.delete(teams).where(and(eq(teams.organizationId, orgId), eq(teams.id, id)));
}

export async function teamMemberIds(q: Q, orgId: string, teamId: string): Promise<string[]> {
  const rows = await q.select({ id: teamMembers.userId }).from(teamMembers).where(and(eq(teamMembers.organizationId, orgId), eq(teamMembers.teamId, teamId)));
  return rows.map((r) => r.id);
}

export async function teamsOfUsers(q: Q, orgId: string, userIds: string[]) {
  if (!userIds.length) return [];
  return q
    .select({ userId: teamMembers.userId, teamId: teams.id, name: teams.name })
    .from(teamMembers)
    .innerJoin(teams, and(eq(teams.organizationId, teamMembers.organizationId), eq(teams.id, teamMembers.teamId)))
    .where(and(eq(teamMembers.organizationId, orgId), inArray(teamMembers.userId, userIds)));
}

export async function addTeamMembers(q: Q, orgId: string, teamId: string, userIds: string[]) {
  if (userIds.length) await q.insert(teamMembers).values(userIds.map((userId) => ({ organizationId: orgId, teamId, userId }))).onConflictDoNothing();
}

export async function removeTeamMembers(q: Q, orgId: string, teamId: string, userIds: string[]) {
  if (userIds.length) await q.delete(teamMembers).where(and(eq(teamMembers.organizationId, orgId), eq(teamMembers.teamId, teamId), inArray(teamMembers.userId, userIds)));
}

/** Live invitations addressed to an email, across organizations (landing and picker, PRD-02 §6.2). */
export async function pendingInvitationsForEmail(q: Q, email: string) {
  return q
    .select({ invitation: invitations, org: organizations })
    .from(invitations)
    .innerJoin(organizations, eq(organizations.id, invitations.organizationId))
    .where(and(eq(invitations.email, email), eq(invitations.status, "pending"), sql`${invitations.expiresAt} > now()`, eq(organizations.status, "active")))
    .orderBy(asc(organizations.name));
}
