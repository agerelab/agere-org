// Organization and membership tables. Every query that reads organization data names the organization.
import { and, asc, count, eq, gt, inArray } from "drizzle-orm";
import { invitations, memberships, organizations } from "@/db/schema";
import type { Db, Tx } from "@/db/client";

type Q = Db | Tx;
export type OrgRow = typeof organizations.$inferSelect;
export type MembershipRow = typeof memberships.$inferSelect;

export async function findBySlug(q: Q, slug: string): Promise<OrgRow | undefined> {
  const [row] = await q.select().from(organizations).where(eq(organizations.slug, slug));
  return row;
}

export async function slugsTaken(q: Q, candidates: string[]): Promise<Set<string>> {
  if (!candidates.length) return new Set();
  const rows = await q.select({ slug: organizations.slug }).from(organizations).where(inArray(organizations.slug, candidates));
  return new Set(rows.map((r) => r.slug));
}

export async function createdCount(q: Q, userId: string): Promise<number> {
  const [row] = await q.select({ n: count() }).from(organizations).where(eq(organizations.createdBy, userId));
  return row?.n ?? 0;
}

export async function insertOrganization(tx: Tx, org: typeof organizations.$inferInsert) {
  await tx.insert(organizations).values(org);
}

export async function insertMembership(tx: Tx, m: typeof memberships.$inferInsert) {
  await tx.insert(memberships).values(m);
}

export async function membershipOf(q: Q, organizationId: string, userId: string): Promise<MembershipRow | undefined> {
  const [row] = await q.select().from(memberships).where(and(eq(memberships.organizationId, organizationId), eq(memberships.userId, userId)));
  return row;
}

/** The user's active memberships with their organizations, by name. */
export async function organizationsOf(q: Q, userId: string) {
  return q
    .select({ org: organizations, role: memberships.role })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(and(eq(memberships.userId, userId), eq(memberships.status, "active")))
    .orderBy(asc(organizations.name));
}

/** Live invitation for this email in any organization (PRD-02 §6.2 step 5). */
export async function hasPendingInvitation(q: Q, email: string): Promise<boolean> {
  const [row] = await q
    .select({ id: invitations.id })
    .from(invitations)
    .where(and(eq(invitations.email, email.trim().toLowerCase()), eq(invitations.status, "pending"), gt(invitations.expiresAt, new Date())))
    .limit(1);
  return !!row;
}
