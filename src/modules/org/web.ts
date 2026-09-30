import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import type { RequestContext } from "@/lib/context";
import { requireVerifiedUser } from "@/modules/identity/web";
import { listMyOrganizations, rememberOrganization, resolveOrg, type OrgSummary } from "./service";

export type OrgPage = {
  ctx: RequestContext;
  org: { id: string; slug: string; name: string; timezone: string; defaultLocale: "en" | "id" };
  user: { id: string; name: string; email: string };
  orgs: OrgSummary[];
};

/**
 * Everything an organization page needs, resolved once per request (TECH-01 §5.1 steps 2–4):
 * session → slug → membership. Not a member → 404; suspended or pending deletion → explanation page.
 */
export const requireOrg = cache(async (slug: string): Promise<OrgPage> => {
  const { user } = await requireVerifiedUser();
  const r = await resolveOrg(slug, user.id);
  if (!r.ok) {
    if (r.code === "NOT_FOUND") notFound();
    redirect(`/tidak-tersedia?status=${r.code === "SUSPENDED" ? "suspended" : "pending_deletion"}`);
  }
  await rememberOrganization(user.id, user.lastOrganizationId, r.org.id);
  return {
    ctx: { requestId: crypto.randomUUID(), userId: user.id, organizationId: r.org.id, role: r.role },
    org: { id: r.org.id, slug: r.org.slug, name: r.org.name, timezone: r.org.timezone, defaultLocale: r.org.defaultLocale },
    user: { id: user.id, name: user.name, email: user.email },
    orgs: await listMyOrganizations(user.id),
  };
});
