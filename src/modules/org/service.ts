// Organization (PRD-02): creation, URL context, landing after sign-in.
import { getDb, type Tx } from "@/db/client";
import { uuidv7 } from "@/lib/ids";
import type { RequestContext, Role } from "@/lib/context";
import { publish } from "@/modules/events";
import { setupOrganizationApps } from "@/modules/authz/service";
import { setLastOrganization } from "@/modules/identity/repository";
import type { Locale } from "@/i18n";
import * as repo from "./repository";
import { slugProblem } from "./slug";

export const MAX_CREATED_PER_USER = 5;
export type OrgSummary = { id: string; slug: string; name: string; role: Role };

export type CreateInput = { name: string; slug: string; timezone: string; defaultLocale: Locale };
export type CreateResult =
  | { ok: true; org: repo.OrgRow; eventIds: string[] }
  | { ok: false; code: "SLUG_INVALID" | "SLUG_RESERVED" | "LIMIT" }
  | { ok: false; code: "SLUG_TAKEN"; suggestion: string };

export const isTimezone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

/** First free "slug-2", "slug-3", … ("Alamat ini sudah dipakai. Coba maju-jaya-2."). */
export async function suggestSlug(slug: string): Promise<string> {
  const base = slug.slice(0, 37).replace(/-+$/, "");
  const candidates = Array.from({ length: 20 }, (_, i) => `${base}-${i + 2}`);
  const taken = await repo.slugsTaken(getDb(), candidates);
  return candidates.find((c) => !taken.has(c)) ?? `${base}-${Date.now().toString(36).slice(-4)}`;
}

export async function slugAvailable(slug: string): Promise<boolean> {
  return !slugProblem(slug) && !(await repo.findBySlug(getDb(), slug));
}

/** US-1: the creator becomes Owner; org.organization.created is audited in the same transaction. */
/**
 * `seed` runs inside the creating transaction with the new Owner's context, so the Titik mulai
 * content (PRD-02 §6.3) exists exactly when the organization does. Supplied by the caller to keep
 * this module free of app imports.
 */
export async function createOrganization(userId: string, input: CreateInput, requestId?: string, seed?: (tx: Tx, ctx: RequestContext) => Promise<string[]>): Promise<CreateResult> {
  const problem = slugProblem(input.slug);
  if (problem) return { ok: false, code: problem === "reserved" ? "SLUG_RESERVED" : "SLUG_INVALID" };
  const db = getDb();
  if ((await repo.createdCount(db, userId)) >= MAX_CREATED_PER_USER) return { ok: false, code: "LIMIT" };
  if (await repo.findBySlug(db, input.slug)) return { ok: false, code: "SLUG_TAKEN", suggestion: await suggestSlug(input.slug) };

  const id = uuidv7();
  try {
    const eventIds = await db.transaction(async (tx) => {
      await repo.insertOrganization(tx, {
        id,
        slug: input.slug,
        name: input.name.trim(),
        timezone: input.timezone,
        defaultLocale: input.defaultLocale,
        createdBy: userId,
      });
      await repo.insertMembership(tx, { organizationId: id, userId, role: "owner" });
      await setupOrganizationApps(tx, id, userId);
      await setLastOrganization(tx, userId, id);
      const created = await publish(
        tx,
        { scope: "organization", organizationId: id, actor: { type: "user", userId }, requestId },
        { type: "org.organization.created", subject: { module: "org", type: "organization", id }, data: { slug: input.slug, name: input.name.trim() } },
      );
      const seeded = seed ? await seed(tx, { requestId: requestId ?? "create-org", organizationId: id, userId, role: "owner" }) : [];
      return [created, ...seeded];
    });
    const org = (await repo.findBySlug(db, input.slug))!;
    return { ok: true, org, eventIds };
  } catch (e) {
    // Lost a race for the slug between the check and the insert.
    if (await repo.findBySlug(db, input.slug)) return { ok: false, code: "SLUG_TAKEN", suggestion: await suggestSlug(input.slug) };
    throw e;
  }
}

export type Resolved =
  | { ok: true; org: repo.OrgRow; role: Role }
  | { ok: false; code: "NOT_FOUND" | "SUSPENDED" | "PENDING_DELETION" };

/**
 * slug → organization for this user (PRD-02 §6.2, PRD-04 L1). Unknown slug, no membership or a
 * suspended membership are all NOT_FOUND, so nothing about other organizations is disclosed.
 */
export async function resolveOrg(slug: string, userId: string): Promise<Resolved> {
  const db = getDb();
  const org = await repo.findBySlug(db, slug);
  if (!org) return { ok: false, code: "NOT_FOUND" };
  const m = await repo.membershipOf(db, org.id, userId);
  if (!m || m.status !== "active") return { ok: false, code: "NOT_FOUND" };
  if (org.status === "suspended") return { ok: false, code: "SUSPENDED" };
  if (org.status === "pending_deletion" && m.role !== "owner") return { ok: false, code: "PENDING_DELETION" };
  return { ok: true, org, role: m.role };
}

export async function listMyOrganizations(userId: string): Promise<OrgSummary[]> {
  const rows = await repo.organizationsOf(getDb(), userId);
  return rows.map((r) => ({ id: r.org.id, slug: r.org.slug, name: r.org.name, role: r.role }));
}

/** Landing after sign-in (PRD-02 §6.2, steps 2–5; step 1, redirect_to, is the caller's). */
export async function landingPath(user: { id: string; email?: string; lastOrganizationId: string | null }): Promise<string> {
  const orgs = await listMyOrganizations(user.id);
  const last = orgs.find((o) => o.id === user.lastOrganizationId);
  if (last) return `/${last.slug}`;
  if (orgs.length === 1) return `/${orgs[0].slug}`;
  if (orgs.length > 1) return "/pilih-organisasi";
  // Pending invitations are offered in the picker before onboarding (step 5).
  if (user.email && (await repo.hasPendingInvitation(getDb(), user.email))) return "/pilih-organisasi";
  return "/buat-organisasi";
}

/** Remembers the organization the user works in, only to choose the next landing page. */
export async function rememberOrganization(userId: string, current: string | null, organizationId: string) {
  if (current !== organizationId) await setLastOrganization(getDb(), userId, organizationId);
}
