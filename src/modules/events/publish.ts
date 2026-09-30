// events.publish (PRD-00b §6–§7): writes the outbox row, one delivery row per registered consumer and,
// when the catalog says so, the audit row — all inside the caller's transaction (D1, D2).
import { uuidv7 } from "@/lib/ids";
import type { Tx } from "@/db/client";
import { CATALOG, type EventType } from "./catalog";
import { getConsumer } from "./consumers";
import { insertEvent } from "./repository";

export type Actor = { type: "user"; userId: string } | { type: "system" } | { type: "platform_admin"; adminId: string };
export type Subject = { module: string; type: string; id: string; container?: { type: string; id: string } };

/** Who is publishing: the request context for organization events, the user for user-scoped ones. */
export type PublishContext =
  | { scope: "organization"; organizationId: string; actor: Actor; requestId?: string; ipHash?: string | null }
  | { scope: "user"; actor: Actor; requestId?: string };

export type PublishInput = {
  type: EventType;
  subject: Subject;
  data?: Record<string, unknown>;
  /** JSON paths in `data` holding personal data (e.g. "data.email_hash"); redacted in audit. */
  pii?: string[];
  /** Organization events only: must equal the context organization (D14). */
  organizationId?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  causationId?: string;
  bulkOperationId?: string;
};

export class PublishError extends Error {}

const RELEASE = process.env.VERCEL_DEPLOYMENT_ID ?? "local";

function redact(value: Record<string, unknown> | null | undefined, pii: string[]) {
  if (!value) return value ?? null;
  const out = { ...value };
  for (const path of pii) {
    const key = path.replace(/^(data|before|after)\./, "");
    if (key in out) out[key] = "[redacted]";
  }
  return out;
}

export async function publish(tx: Tx, ctx: PublishContext, input: PublishInput): Promise<string> {
  const entry = CATALOG[input.type];
  if (entry.scope !== ctx.scope) throw new PublishError(`${input.type} is ${entry.scope}-scoped`);
  let organizationId: string | null = null;
  if (ctx.scope === "organization") {
    organizationId = input.organizationId ?? ctx.organizationId;
    if (organizationId !== ctx.organizationId) throw new PublishError("organization_id differs from the request context");
  } else if (input.organizationId) {
    throw new PublishError("user-scoped events carry no organization_id");
  }

  const eventId = uuidv7();
  const occurredAt = new Date();
  const actorId = ctx.actor.type === "user" ? ctx.actor.userId : ctx.actor.type === "platform_admin" ? ctx.actor.adminId : null;
  const pii = input.pii ?? [];
  const audit = entry.audit && organizationId
    ? {
        id: uuidv7(),
        organizationId,
        occurredAt,
        actorType: ctx.actor.type,
        actorId,
        action: input.type,
        resourceType: input.subject.type,
        resourceId: input.subject.id,
        before: redact(input.before, pii),
        after: redact(input.after ?? input.data ?? null, pii),
        ipHash: ctx.scope === "organization" ? (ctx.ipHash ?? null) : null,
        requestId: ctx.requestId ?? null,
        eventId,
      }
    : null;

  await insertEvent(
    tx,
    {
      eventId,
      type: input.type,
      version: entry.version,
      scope: entry.scope,
      organizationId,
      occurredAt,
      producer: { module: input.subject.module, release: RELEASE },
      actor: ctx.actor,
      subject: input.subject,
      data: input.data ?? {},
      audit: entry.audit,
      pii,
      requestId: ctx.requestId ?? null,
      causationId: input.causationId ?? null,
      bulkOperationId: input.bulkOperationId ?? null,
    },
    entry.consumers.filter((c) => getConsumer(c)),
    audit,
  );
  return eventId;
}
