// How Space asks authz (PRD-04 §6.4): a space is a container; a project inherits its space and adds
// its own grants, or, when restricted, uses only its own (I1: never wider than the space).
import type { Db, Tx } from "@/db/client";
import type { RequestContext, Role } from "@/lib/context";
import type { AclLevel } from "@/db/schema";
import * as authz from "@/modules/authz/service";
import { atLeast, type Level } from "@/modules/authz/levels";
import { isAdminRole } from "@/modules/authz/matrix";
import { memberships } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const APP = "space";
export type ProjectRef = { id: string; spaceId: string; access: "inherit" | "restricted" };

export const spaceChain = (spaceId: string): authz.Container[] => [{ type: "space.space", id: spaceId }];
export const projectChain = (p: ProjectRef): authz.Container[] => [{ type: "space.project", id: p.id, inherit: p.access === "inherit" }, ...spaceChain(p.spaceId)];

export async function checkSpace(ctx: RequestContext, need: AclLevel, spaceId: string) {
  return authz.check(ctx, need, { app: APP, chain: spaceChain(spaceId) });
}

export async function checkProject(ctx: RequestContext, need: AclLevel, p: ProjectRef) {
  return authz.check(ctx, need, { app: APP, chain: projectChain(p) });
}

/** Can this member (by id) view the project? Owners/Admins can (override); others need a grant. */
export async function memberCanView(q: Db | Tx, organizationId: string, userId: string, p: ProjectRef): Promise<boolean> {
  const [m] = await q.select().from(memberships).where(and(eq(memberships.organizationId, organizationId), eq(memberships.userId, userId)));
  if (!m || m.status !== "active") return false;
  const ctx = { requestId: "check", organizationId, userId, role: m.role as Role };
  if ((await authz.appAccess(q, ctx, APP)) !== "ok") return false;
  if (isAdminRole(m.role)) return true;
  return atLeast(await authz.effectiveLevel(q, ctx, projectChain(p)), "view");
}

/** Explicit level (no governance override), for the team rule of the assignee picker (US-12). */
export async function explicitLevel(q: Db | Tx, organizationId: string, userId: string, p: ProjectRef): Promise<Level> {
  return authz.effectiveLevel(q, { organizationId, userId }, projectChain(p));
}

