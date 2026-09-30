import { createHash } from "node:crypto";
import type { RequestContext } from "@/lib/context";

export const orgCtx = (ctx: RequestContext) => ({
  scope: "organization" as const,
  organizationId: ctx.organizationId,
  actor: { type: "user" as const, userId: ctx.userId },
  requestId: ctx.requestId,
});

/** Emails outside identity and invitations are stored as hashes (PRD-13 §5, PRD-03 §7). */
export const emailHash = (email: string) => createHash("sha256").update(`email:${email.trim().toLowerCase()}`).digest("base64url").slice(0, 32);

export type Fail<C extends string> = { ok: false; code: C };
