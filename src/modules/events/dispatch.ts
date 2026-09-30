// Delivery (PRD-00b §7): fast path right after commit, and the per-minute sweeper as the retry path.
import { getDb } from "@/db/client";
import { getConsumer } from "./consumers";
import { claimDue, getEvent, markDone, markFailed } from "./repository";

/** Backoff in minutes after attempt n (D11); after 8 failed attempts the delivery is dead. */
const BACKOFF = [1, 2, 4, 8, 16, 30, 60];
export const MAX_ATTEMPTS = 8;

async function run(claims: Awaited<ReturnType<typeof claimDue>>) {
  const db = getDb();
  let done = 0;
  for (const c of claims) {
    const consumer = getConsumer(c.consumer);
    const event = await getEvent(db, c.eventId);
    const attempts = c.attempts + 1;
    try {
      if (!consumer) throw new Error(`no consumer registered as ${c.consumer}`);
      if (!event) throw new Error("event missing");
      await consumer.handle(event);
      await markDone(db, c.eventId, c.consumer);
      done++;
    } catch (e) {
      const retry = attempts >= MAX_ATTEMPTS ? null : BACKOFF[Math.min(attempts - 1, BACKOFF.length - 1)];
      await markFailed(db, c.eventId, c.consumer, attempts, e instanceof Error ? e.message : String(e), retry);
      if (retry === null) console.error(`[events] dead delivery ${c.eventId} → ${c.consumer}`);
    }
  }
  return { claimed: claims.length, done };
}

/** Fast path (D3): deliver one event's pending rows. Best-effort — the sweeper covers failures. */
export async function dispatch(eventId: string) {
  return run(await claimDue(getDb(), { eventId, limit: 50 }));
}

/** Sweeper (D4): claim up to 100 due deliveries and run them. */
export async function sweep(limit = 100) {
  return run(await claimDue(getDb(), { limit }));
}
