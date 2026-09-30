import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { auditLog, eventDeliveries, outboxEvents } from "@/db/schema";
import type { Db } from "@/db/client";
import { dispatch, MAX_ATTEMPTS, publish, PublishError, registerConsumer, sweep } from "@/modules/events";
import { clearConsumers } from "@/modules/events/consumers";
import { freshDb } from "../helpers/db";

const ORG = "00000000-0000-7000-8000-00000000000a";
const OTHER = "00000000-0000-7000-8000-00000000000b";
const USER = "00000000-0000-7000-8000-0000000000a1";
const orgCtx = { scope: "organization" as const, organizationId: ORG, actor: { type: "user" as const, userId: USER }, requestId: "req-1" };
const subject = { module: "org", type: "organization", id: ORG };

let db: Db;
beforeEach(async () => {
  ({ db } = await freshDb());
  clearConsumers();
});
afterEach(() => clearConsumers());

describe("publish (PRD-00b §7.1)", () => {
  it("writes the event, a delivery per registered consumer and the audit row in one transaction", async () => {
    registerConsumer({ name: "notifications", replayable: false, handle: async () => {} });
    const id = await db.transaction((tx) =>
      publish(tx, orgCtx, { type: "org.ownership.transferred", subject, before: { owner: "a" }, after: { owner: "b" } }),
    );
    const [event] = await db.select().from(outboxEvents).where(eq(outboxEvents.eventId, id));
    expect(event).toMatchObject({ type: "org.ownership.transferred", scope: "organization", organizationId: ORG, audit: true, version: 1 });
    expect(await db.select().from(eventDeliveries)).toMatchObject([{ eventId: id, consumer: "notifications", status: "pending" }]);
    expect(await db.select().from(auditLog)).toMatchObject([
      { organizationId: ORG, action: "org.ownership.transferred", actorType: "user", actorId: USER, before: { owner: "a" }, after: { owner: "b" }, eventId: id },
    ]);
  });

  it("rolls everything back with the mutation (D1)", async () => {
    await expect(
      db.transaction(async (tx) => {
        await publish(tx, orgCtx, { type: "org.organization.created", subject });
        throw new Error("mutation failed");
      }),
    ).rejects.toThrow("mutation failed");
    expect(await db.select().from(outboxEvents)).toHaveLength(0);
    expect(await db.select().from(auditLog)).toHaveLength(0);
  });

  it("rejects an organization other than the request context, and org ids on user events (D14)", async () => {
    await expect(db.transaction((tx) => publish(tx, orgCtx, { type: "org.organization.created", subject, organizationId: OTHER }))).rejects.toBeInstanceOf(PublishError);
    const userCtx = { scope: "user" as const, actor: { type: "user" as const, userId: USER } };
    await expect(db.transaction((tx) => publish(tx, userCtx, { type: "security.password.changed", subject, organizationId: ORG }))).rejects.toBeInstanceOf(PublishError);
    await expect(db.transaction((tx) => publish(tx, userCtx, { type: "org.organization.created", subject }))).rejects.toBeInstanceOf(PublishError);
  });

  it("never audits user-scoped events and redacts PII paths", async () => {
    const userCtx = { scope: "user" as const, actor: { type: "user" as const, userId: USER } };
    await db.transaction((tx) => publish(tx, userCtx, { type: "security.password.changed", subject: { module: "identity", type: "user", id: USER } }));
    expect(await db.select().from(auditLog)).toHaveLength(0);
    await db.transaction((tx) => publish(tx, orgCtx, { type: "org.organization.updated", subject, data: { name: "Maju", email_hash: "h" }, pii: ["data.email_hash"] }));
    const [row] = await db.select().from(auditLog);
    expect(row.after).toEqual({ name: "Maju", email_hash: "[redacted]" });
  });

  it("keeps audit rows append-only (PRD-11 US-4)", async () => {
    await db.transaction((tx) => publish(tx, orgCtx, { type: "org.organization.created", subject }));
    await expect(db.execute(sql`UPDATE audit_log SET action = 'x'`)).rejects.toThrow();
    await expect(db.execute(sql`DELETE FROM audit_log`)).rejects.toThrow();
    expect(await db.select().from(auditLog)).toHaveLength(1);
  });
});

describe("delivery (PRD-00b §7.2–7.5)", () => {
  it("delivers on the fast path and marks the row done", async () => {
    const seen: string[] = [];
    registerConsumer({ name: "notifications", replayable: false, handle: async (e) => void seen.push(e.type) });
    const id = await db.transaction((tx) => publish(tx, orgCtx, { type: "org.ownership.transferred", subject }));
    expect(await dispatch(id)).toEqual({ claimed: 1, done: 1 });
    expect(seen).toEqual(["org.ownership.transferred"]);
    expect((await db.select().from(eventDeliveries))[0].status).toBe("done");
    expect(await dispatch(id)).toEqual({ claimed: 0, done: 0 });
  });

  it("backs off after a failure and goes dead after 8 attempts (D11)", async () => {
    registerConsumer({ name: "notifications", replayable: false, handle: async () => { throw new Error("smtp down"); } });
    await db.transaction((tx) => publish(tx, orgCtx, { type: "org.ownership.transferred", subject }));
    await sweep();
    let [row] = await db.select().from(eventDeliveries);
    expect(row).toMatchObject({ status: "failed", attempts: 1, lastError: "smtp down" });
    expect(row.nextAttemptAt.getTime()).toBeGreaterThan(Date.now() + 30_000);
    for (let i = 1; i < MAX_ATTEMPTS; i++) {
      await db.update(eventDeliveries).set({ nextAttemptAt: new Date(0) });
      await sweep();
    }
    [row] = await db.select().from(eventDeliveries);
    expect(row).toMatchObject({ status: "dead", attempts: MAX_ATTEMPTS });
    await db.update(eventDeliveries).set({ nextAttemptAt: new Date(0) });
    expect(await sweep()).toEqual({ claimed: 0, done: 0 });
  });
});
