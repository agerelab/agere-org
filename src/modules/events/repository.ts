import { and, eq, inArray, sql } from "drizzle-orm";
import { auditLog, eventDeliveries, outboxEvents } from "@/db/schema";
import type { Db, Tx } from "@/db/client";

export type StoredEvent = typeof outboxEvents.$inferSelect;
type NewEvent = typeof outboxEvents.$inferInsert;
type NewAudit = typeof auditLog.$inferInsert;

export async function insertEvent(tx: Tx, event: NewEvent, consumers: string[], audit: NewAudit | null) {
  await tx.insert(outboxEvents).values(event);
  if (consumers.length) await tx.insert(eventDeliveries).values(consumers.map((consumer) => ({ eventId: event.eventId, consumer })));
  if (audit) await tx.insert(auditLog).values(audit);
}

export async function getEvent(db: Db, eventId: string): Promise<StoredEvent | undefined> {
  const [row] = await db.select().from(outboxEvents).where(eq(outboxEvents.eventId, eventId));
  return row;
}

type Claimed = { eventId: string; consumer: string; attempts: number };

/**
 * Claims due deliveries with a 2-minute lease (PRD-00b D4). FOR UPDATE SKIP LOCKED keeps two
 * overlapping sweeps from taking the same row; the lease keeps a crashed run from holding it forever.
 */
export async function claimDue(db: Db, opts: { eventId?: string; limit: number }): Promise<Claimed[]> {
  const byEvent = opts.eventId ? sql`AND event_id = ${opts.eventId}` : sql``;
  const rows = await db.execute(sql`
    UPDATE event_deliveries d SET locked_until = now() + interval '2 minutes'
    FROM (
      SELECT event_id, consumer FROM event_deliveries
      WHERE status IN ('pending', 'failed') AND next_attempt_at <= now()
        AND (locked_until IS NULL OR locked_until < now()) ${byEvent}
      ORDER BY next_attempt_at
      LIMIT ${opts.limit}
      FOR UPDATE SKIP LOCKED
    ) due
    WHERE d.event_id = due.event_id AND d.consumer = due.consumer
    RETURNING d.event_id, d.consumer, d.attempts`);
  const list = (Array.isArray(rows) ? rows : (rows as { rows: unknown[] }).rows) as { event_id: string; consumer: string; attempts: number }[];
  return list.map((r) => ({ eventId: r.event_id, consumer: r.consumer, attempts: r.attempts }));
}

export async function markDone(db: Db, eventId: string, consumer: string) {
  await db
    .update(eventDeliveries)
    .set({ status: "done", lockedUntil: null, attempts: sql`${eventDeliveries.attempts} + 1`, lastError: null })
    .where(and(eq(eventDeliveries.eventId, eventId), eq(eventDeliveries.consumer, consumer)));
}

export async function markFailed(db: Db, eventId: string, consumer: string, attempts: number, error: string, retryInMinutes: number | null) {
  await db
    .update(eventDeliveries)
    .set({
      status: retryInMinutes === null ? "dead" : "failed",
      attempts,
      lastError: error.slice(0, 2000),
      lockedUntil: null,
      nextAttemptAt: sql`now() + make_interval(mins => ${retryInMinutes ?? 0})`,
    })
    .where(and(eq(eventDeliveries.eventId, eventId), eq(eventDeliveries.consumer, consumer)));
}

/** Reconciliation (PRD-00b D12): pending rows older than 10 minutes and all dead rows. */
export async function stuckDeliveries(db: Db) {
  return db
    .select()
    .from(eventDeliveries)
    .where(
      sql`${eventDeliveries.status} = 'dead' OR (${eventDeliveries.status} = 'pending' AND ${eventDeliveries.nextAttemptAt} < now() - interval '10 minutes')`,
    );
}

export async function deliveriesFor(db: Db, eventIds: string[]) {
  if (!eventIds.length) return [];
  return db.select().from(eventDeliveries).where(inArray(eventDeliveries.eventId, eventIds));
}

