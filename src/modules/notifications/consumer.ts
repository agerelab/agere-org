// The "notifications" consumer (PRD-10 §5 rule table). It turns catalog events into Kotak masuk items
// and account-critical email. Idempotent (PRD-00b D5): items are unique per (recipient, event) and
// email per (event, address), so a retried delivery changes nothing. The actor never hears about
// their own action; recipients must still be active members when the event is delivered.
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { memberships, organizations, teamMembers, teams, users } from "@/db/schema";
import { translator, type Locale, type MessageKey } from "@/i18n";
import { uuidv7 } from "@/lib/ids";
import { registerConsumer } from "@/modules/events";
import type { StoredEvent } from "@/modules/events/repository";
import { sendEmail } from "@/modules/identity/email";
import { isAdminRole } from "@/modules/authz/matrix";
import { memberCanView } from "@/modules/space/access";
import * as space from "@/modules/space/repository";
import * as repo from "./repository";
import { FOR_ME, type Kind } from "./types";

type Org = typeof organizations.$inferSelect;
type Item = { recipient: string; kind: Kind; vars: Record<string, string | number>; targetUrl: string | null; subject?: { type: "space.project"; id: string } };

const actorOf = (e: StoredEvent) => (e.actor.type === "user" ? String(e.actor.userId) : null);
const subjectId = (e: StoredEvent): string => String(e.subject.id);
const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const str = (v: unknown) => (typeof v === "string" ? v : null);

async function nameOf(userId: string | null | undefined) {
  if (!userId) return null;
  const [u] = await getDb().select({ name: users.name }).from(users).where(eq(users.id, userId));
  return u?.name ?? null;
}

/** Active members among `ids`, so a removed or suspended person gets nothing (§9). */
async function activeAmong(orgId: string, ids: string[]) {
  if (!ids.length) return [];
  const rows = await getDb()
    .select({ id: memberships.userId, role: memberships.role })
    .from(memberships)
    .where(and(eq(memberships.organizationId, orgId), inArray(memberships.userId, ids), eq(memberships.status, "active")));
  return rows;
}

async function teamMemberIds(orgId: string, teamId: string) {
  const rows = await getDb().select({ id: teamMembers.userId }).from(teamMembers).where(and(eq(teamMembers.organizationId, orgId), eq(teamMembers.teamId, teamId)));
  return rows.map((r) => r.id);
}

/** Where a task opens: its project board with the task modal (PRD-06 §6.5). */
async function taskTarget(org: Org, taskId: string) {
  const t = await space.task(getDb(), org.id, taskId);
  if (!t) return null;
  const p = await space.project(getDb(), org.id, t.projectId);
  if (!p) return null;
  return { task: t, project: p, url: `/${org.slug}/s/${p.spaceId}/${p.id}/papan?task=${t.id}` };
}

/** In-app items per the §5 rule table. */
async function itemsFor(e: StoredEvent, org: Org): Promise<Item[]> {
  const actorId = actorOf(e);
  const actor = await nameOf(actorId);
  const data = e.data as Record<string, unknown>;
  const db = getDb();

  switch (e.type) {
    case "space.task.assigned": {
      const target = await taskTarget(org, subjectId(e));
      if (!target) return [];
      const base = { vars: { actor: actor ?? "agere", task: target.task.title, project: target.project.name, taskId: target.task.id }, targetUrl: target.url, subject: { type: "space.project" as const, id: target.project.id } };
      if (data.assignee_type === "user") return [{ recipient: String(data.assignee_id), kind: "task_assigned", ...base }];
      const [team] = await db.select({ name: teams.name }).from(teams).where(and(eq(teams.organizationId, org.id), eq(teams.id, String(data.assignee_id))));
      if (!team) return [];
      const out: Item[] = [];
      // Team assignment: members who can view the project (PRD-06 §6.1: assignment grants no access).
      for (const id of await teamMemberIds(org.id, String(data.assignee_id)))
        if (await memberCanView(db, org.id, id, target.project)) out.push({ recipient: id, kind: "task_assigned_team", ...base, vars: { ...base.vars, team: team.name } });
      return out;
    }
    case "space.comment.created": {
      const mentions = Array.isArray(data.mentions) ? (data.mentions as string[]) : [];
      if (!mentions.length) return [];
      const target = await taskTarget(org, subjectId(e));
      if (!target) return [];
      const out: Item[] = [];
      for (const id of mentions)
        if (await memberCanView(db, org.id, id, target.project))
          out.push({ recipient: id, kind: "comment_mention", vars: { actor: actor ?? "agere", task: target.task.title, taskId: target.task.id }, targetUrl: target.url, subject: { type: "space.project", id: target.project.id } });
      return out;
    }
    case "membership.work.reassigned": {
      const counts = (data.counts ?? {}) as Record<string, number>;
      const total = Object.values(counts).reduce((a, b) => a + (Number(b) || 0), 0);
      if (!total) return [];
      const from = (await nameOf(str(data.from_user_id))) ?? "—";
      return [{ recipient: subjectId(e), kind: "work_reassigned", vars: { count: counts.space ?? total, from }, targetUrl: `/${org.slug}/desk/tugas-saya` }];
    }
    case "membership.member.activated": {
      const name = (await nameOf(subjectId(e))) ?? "—";
      const admins = await db
        .select({ id: memberships.userId, role: memberships.role })
        .from(memberships)
        .where(and(eq(memberships.organizationId, org.id), eq(memberships.status, "active")));
      return admins
        .filter((a) => isAdminRole(a.role) && a.id !== subjectId(e))
        .map((a) => ({ recipient: a.id, kind: "member_joined" as const, vars: { name, org: org.name }, targetUrl: `/${org.slug}/organisasi/anggota` }));
    }
    case "access.role.changed": {
      const role = str(data.role);
      if (!role) return [];
      return [{ recipient: subjectId(e), kind: "role_changed", vars: { org: org.name, role }, targetUrl: `/${org.slug}/organisasi/anggota` }];
    }
    case "access.app_grant.created":
    case "access.app_grant.revoked": {
      const kind: Kind = e.type === "access.app_grant.created" ? "app_granted" : "app_revoked";
      const vars = { app: str(data.app) ?? "space" };
      const url = kind === "app_granted" ? `/${org.slug}/s` : `/${org.slug}/desk/kotak-masuk`;
      // "Semua anggota" grants are not announced to everyone (§5 names users and team members only).
      if (data.principal_type === "user") return [{ recipient: String(data.principal_id), kind, vars, targetUrl: url }];
      if (data.principal_type === "team") return (await teamMemberIds(org.id, String(data.principal_id))).map((id) => ({ recipient: id, kind, vars, targetUrl: url }));
      return [];
    }
    case "space.project.updated": {
      const before = (data.before ?? {}) as Record<string, unknown>;
      const after = (data.after ?? {}) as Record<string, unknown>;
      if (!("status" in after) || before.status === after.status || !after.status) return [];
      const p = await space.project(db, org.id, subjectId(e));
      if (!p?.ownerUserId) return [];
      return [{ recipient: p.ownerUserId, kind: "project_status", vars: { actor: actor ?? "agere", project: p.name, status: String(after.status) }, targetUrl: `/${org.slug}/s/${p.spaceId}/${p.id}/ringkasan`, subject: { type: "space.project", id: p.id } }];
    }
    default:
      return [];
  }
}

async function deliverItems(e: StoredEvent, org: Org, items: Item[]) {
  const actorId = actorOf(e);
  const wanted = items.filter((i) => i.recipient !== actorId);
  const active = new Set((await activeAmong(org.id, [...new Set(wanted.map((i) => i.recipient))])).map((m) => m.id));
  await repo.insertMany(
    getDb(),
    wanted
      .filter((i) => active.has(i.recipient))
      .map((i) => ({
        organizationId: org.id,
        id: uuidv7(),
        recipientUserId: i.recipient,
        dedupeKey: e.eventId,
        eventId: e.eventId,
        type: i.kind,
        actorUserId: actorId,
        vars: i.vars,
        targetUrl: i.targetUrl,
        subjectType: i.subject?.type ?? null,
        subjectId: i.subject?.id ?? null,
        forMe: FOR_ME.includes(i.kind),
        createdAt: e.occurredAt,
      })),
  );
}

// ---------- account-critical email (§5) ----------

type Mail = { subject: MessageKey; body: MessageKey; args: (name: string) => string[] };

const ORG_MAIL: Record<string, Mail> = {
  "membership.member.suspended": { subject: "email.suspended.subject", body: "email.suspended.body", args: (n) => [n] },
  "membership.member.reactivated": { subject: "email.reactivated.subject", body: "email.reactivated.body", args: (n) => [n] },
  "membership.member.removed": { subject: "email.removed.subject", body: "email.removed.body", args: (n) => [n] },
};

const USER_MAIL: Record<string, Mail> = {
  "security.password.changed": { subject: "email.passwordChanged.subject", body: "email.passwordChanged.body", args: (n) => [n, `${appUrl()}/lupa-kata-sandi`] },
  "security.login.failed_threshold": { subject: "email.locked.subject", body: "email.locked.body", args: (n) => [n, `${appUrl()}/lupa-kata-sandi`] },
  "security.account.linked": { subject: "email.linked.subject", body: "email.linked.body", args: (n) => [n] },
  "security.account.unlinked": { subject: "email.unlinked.subject", body: "email.unlinked.body", args: (n) => [n] },
  "security.mfa.changed": { subject: "email.mfa.subject", body: "email.mfa.body", args: (n) => [n] },
  "identity.account.deletion_requested": { subject: "email.deletionRequested.subject", body: "email.deletionRequested.body", args: (n) => [n] },
};

/** Sent in the recipient's language: their preference, else the organization default, else English (D45). */
async function mail(e: StoredEvent, userId: string, m: Mail, org: Org | null) {
  const [u] = await getDb().select().from(users).where(eq(users.id, userId));
  if (!u || u.status !== "active") return;
  if (await repo.emailSent(getDb(), e.eventId, u.email)) return;
  const locale: Locale = u.locale ?? org?.defaultLocale ?? "en";
  const t = translator(locale);
  const args = m.args(u.name);
  await sendEmail({ to: u.email, subject: t(m.subject, org?.name ?? "agere/org"), text: t(m.body, ...args, org?.name ?? "agere/org") });
  await repo.recordEmail(getDb(), e.eventId, u.email);
}

export async function handleNotification(e: StoredEvent) {
  if (e.scope === "user") {
    const m = USER_MAIL[e.type];
    if (m) await mail(e, subjectId(e), m, null);
    return;
  }
  if (!e.organizationId) return;
  const [org] = await getDb().select().from(organizations).where(eq(organizations.id, e.organizationId));
  if (!org) return;
  // §9: an organization being deleted only hears about its deletion.
  if (org.status === "pending_deletion" && !e.type.startsWith("org.organization.deletion")) return;
  const m = ORG_MAIL[e.type];
  if (m) return mail(e, subjectId(e), m, org);
  // Bulk rule (§5): parts of a bulk operation are not notified one by one; the summary is.
  if (e.bulkOperationId && e.type !== "membership.work.reassigned") return;
  await deliverItems(e, org, await itemsFor(e, org));
}

registerConsumer({ name: "notifications", replayable: false, handle: handleNotification });
