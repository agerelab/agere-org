import type { RequestContext } from "@/lib/context";

export const orgCtx = (ctx: RequestContext) => ({
  scope: "organization" as const,
  organizationId: ctx.organizationId,
  actor: { type: "user" as const, userId: ctx.userId },
  requestId: ctx.requestId,
});

export type Fail<C extends string> = { ok: false; code: C };

/** Maps an authz denial to the codes Space returns: none → NOT_FOUND (E6), view-only → FORBIDDEN. */
export const denied = (reason: string): "NOT_FOUND" | "FORBIDDEN" | "NO_APP_ACCESS" =>
  reason === "FORBIDDEN" ? "FORBIDDEN" : reason === "NO_APP_ACCESS" || reason === "APP_DISABLED" ? "NO_APP_ACCESS" : "NOT_FOUND";

export const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);
