// Account queries that need raw SQL (TECH-01 §10): JSON paths, intervals and counts.
import { and, desc, eq, gt, inArray, isNotNull, isNull, like, lt, sql } from "drizzle-orm";
import { memberships, outboxEvents, users } from "@/db/schema";
import type { Db, Tx } from "@/db/client";

type Q = Db | Tx;

/** Active Owners per organization, for the "only Owner" rule. */
export async function ownerCounts(q: Q, orgIds: string[]) {
  if (!orgIds.length) return [];
  return q
    .select({ org: memberships.organizationId, n: sql<number>`count(*)::int` })
    .from(memberships)
    .where(and(inArray(memberships.organizationId, orgIds), eq(memberships.role, "owner"), eq(memberships.status, "active")))
    .groupBy(memberships.organizationId);
}

/** Deleted accounts not scrubbed yet, deleted more than `minutes` ago. */
export async function dueForScrub(q: Q, minutes: number) {
  return q
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.status, "deleted"), isNotNull(users.deletedAt), isNull(users.scrubbedAt), lt(users.deletedAt, sql`now() - make_interval(mins => ${minutes})`)));
}

/** The user's own security.* events of the last 30 days, newest first. */
export async function securityEvents(q: Q, userId: string) {
  return q
    .select()
    .from(outboxEvents)
    .where(and(eq(outboxEvents.scope, "user"), like(outboxEvents.type, "security.%"), sql`${outboxEvents.subject}->>'id' = ${userId}`, gt(outboxEvents.occurredAt, sql`now() - interval '30 days'`)))
    .orderBy(desc(outboxEvents.occurredAt))
    .limit(50);
}
