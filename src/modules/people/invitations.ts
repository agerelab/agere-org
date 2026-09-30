// Invitations (PRD-03 §6.1–6.2): pending → accepted | revoked; expired after 7 days; resend issues
// a new token and invalidates the old one. Emails are sent synchronously (PRD-03 §7).
import { getDb } from "@/db/client";
import { uuidv7 } from "@/lib/ids";
import type { RequestContext } from "@/lib/context";
import { translator, type Locale } from "@/i18n";
import { publish } from "@/modules/events";
import { can } from "@/modules/authz/matrix";
import { maskEmail, randomToken, tokenHash } from "@/modules/identity/crypto";
import { sendEmail } from "@/modules/identity/email";
import { normalizeEmail } from "@/modules/identity/repository";
import * as repo from "./repository";
import { emailHash, orgCtx, type Fail } from "./shared";

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_BULK = 20;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type InviteOutcome = { email: string; result: "invited" | "already_member" | "pending" };
type Sender = { name: string; orgName: string; appUrl: string; locale: Locale };

async function mail(email: string, token: string, s: Sender) {
  const t = translator(s.locale);
  await sendEmail({ to: email, subject: t("email.invite.subject", s.orgName), text: t("email.invite.body", s.name, s.orgName, `${s.appUrl}/undangan?token=${token}`) });
}

/** "a@x.id, b@x.id\nc@x.id" → trimmed, lower-cased, de-duplicated; invalid entries returned separately. */
export function parseEmails(raw: string): { valid: string[]; invalid: string[] } {
  const parts = raw.split(/[,\n;]/).map((s) => s.trim()).filter(Boolean);
  const valid = [...new Set(parts.filter((p) => EMAIL.test(p)).map(normalizeEmail))];
  return { valid, invalid: parts.filter((p) => !EMAIL.test(p)) };
}

/** US-1: Owner/Admin invite up to 20 emails as Member or Admin; one pending invitation per email. */
export async function invite(
  ctx: RequestContext,
  input: { emails: string[]; role: "member" | "admin" },
  sender: Sender,
): Promise<{ ok: true; outcomes: InviteOutcome[]; eventIds: string[] } | Fail<"FORBIDDEN" | "TOO_MANY" | "EMPTY">> {
  if (!can(ctx.role, "members.invite")) return { ok: false, code: "FORBIDDEN" };
  const emails = [...new Set(input.emails.map(normalizeEmail))];
  if (!emails.length) return { ok: false, code: "EMPTY" };
  if (emails.length > MAX_BULK) return { ok: false, code: "TOO_MANY" };
  const db = getDb();
  const members = await repo.memberRows(db, ctx.organizationId);
  const outcomes: InviteOutcome[] = [];
  const toSend: { email: string; token: string }[] = [];
  const eventIds = await db.transaction(async (tx) => {
    const ids: string[] = [];
    for (const email of emails) {
      if (members.some((m) => normalizeEmail(m.email) === email)) {
        outcomes.push({ email, result: "already_member" });
        continue;
      }
      const pending = await repo.pendingInvitationFor(tx, ctx.organizationId, email);
      if (pending && pending.expiresAt > new Date()) {
        outcomes.push({ email, result: "pending" });
        continue;
      }
      // An expired pending invitation is closed so the new one can take its place.
      if (pending) await repo.updateInvitation(tx, ctx.organizationId, pending.id, { status: "revoked" });
      const id = uuidv7();
      const token = randomToken();
      await repo.insertInvitation(tx, { organizationId: ctx.organizationId, id, email, role: input.role, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + INVITE_TTL_MS), invitedBy: ctx.userId });
      ids.push(
        await publish(tx, orgCtx(ctx), {
          type: "membership.invitation.created",
          subject: { module: "people", type: "invitation", id },
          data: { role: input.role, email_hash: emailHash(email) },
          pii: ["data.email_hash"],
        }),
      );
      outcomes.push({ email, result: "invited" });
      toSend.push({ email, token });
    }
    return ids;
  });
  for (const m of toSend) await mail(m.email, m.token, sender);
  return { ok: true, outcomes, eventIds };
}

export async function resendInvitation(ctx: RequestContext, id: string, sender: Sender): Promise<{ ok: true; eventIds: string[] } | Fail<"FORBIDDEN" | "NOT_FOUND">> {
  if (!can(ctx.role, "members.invite")) return { ok: false, code: "FORBIDDEN" };
  const db = getDb();
  const inv = await repo.invitation(db, ctx.organizationId, id);
  if (!inv || inv.status !== "pending") return { ok: false, code: "NOT_FOUND" };
  const token = randomToken();
  const eventId = await db.transaction(async (tx) => {
    await repo.updateInvitation(tx, ctx.organizationId, id, { tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + INVITE_TTL_MS) });
    return publish(tx, orgCtx(ctx), { type: "membership.invitation.resent", subject: { module: "people", type: "invitation", id }, data: { email_hash: emailHash(inv.email) }, pii: ["data.email_hash"] });
  });
  await mail(inv.email, token, sender);
  return { ok: true, eventIds: [eventId] };
}

export async function revokeInvitation(ctx: RequestContext, id: string): Promise<{ ok: true; eventIds: string[] } | Fail<"FORBIDDEN" | "NOT_FOUND">> {
  if (!can(ctx.role, "members.invite")) return { ok: false, code: "FORBIDDEN" };
  const db = getDb();
  const inv = await repo.invitation(db, ctx.organizationId, id);
  if (!inv || inv.status !== "pending") return { ok: false, code: "NOT_FOUND" };
  const eventId = await db.transaction(async (tx) => {
    await repo.updateInvitation(tx, ctx.organizationId, id, { status: "revoked" });
    return publish(tx, orgCtx(ctx), { type: "membership.invitation.revoked", subject: { module: "people", type: "invitation", id }, data: { email_hash: emailHash(inv.email) }, pii: ["data.email_hash"] });
  });
  return { ok: true, eventIds: [eventId] };
}

export type InvitationView = { state: "pending" | "expired" | "revoked" | "accepted"; orgName: string; orgSlug: string; maskedEmail: string; email: string; role: "member" | "admin" };

export async function lookupInvitation(token: string): Promise<InvitationView | null> {
  const row = await repo.invitationByTokenHash(getDb(), tokenHash(token));
  if (!row) return null;
  const { invitation: inv, org } = row;
  const state = inv.status === "pending" && inv.expiresAt <= new Date() ? "expired" : inv.status;
  return { state, orgName: org.name, orgSlug: org.slug, maskedEmail: maskEmail(inv.email), email: inv.email, role: inv.role };
}

type Acceptor = { id: string; email: string; emailVerifiedAt: Date | null };

async function accept(user: Acceptor, row: Awaited<ReturnType<typeof repo.invitationByTokenHash>> | undefined) {
  if (!row || row.invitation.status !== "pending" || row.invitation.expiresAt <= new Date()) return { ok: false as const, code: "INVALID" as const };
  if (!user.emailVerifiedAt) return { ok: false as const, code: "UNVERIFIED" as const };
  if (normalizeEmail(user.email) !== row.invitation.email) return { ok: false as const, code: "MISMATCH" as const };
  const { invitation: inv, org } = row;
  const eventId = await getDb().transaction(async (tx) => {
    await repo.updateInvitation(tx, org.id, inv.id, { status: "accepted", acceptedBy: user.id, acceptedAt: new Date() });
    if (!(await repo.membership(tx, org.id, user.id))) await repo.insertMembership(tx, { organizationId: org.id, userId: user.id, role: inv.role });
    return publish(
      tx,
      { scope: "organization", organizationId: org.id, actor: { type: "user", userId: user.id } },
      { type: "membership.member.activated", subject: { module: "people", type: "member", id: user.id }, data: { role: inv.role, invitation_id: inv.id } },
    );
  });
  return { ok: true as const, slug: org.slug, eventIds: [eventId] };
}

/**
 * US-2: the signed-in user's verified email must equal the invited one; the membership becomes
 * active with the invited role. Re-inviting a removed person creates a fresh membership.
 */
export async function acceptInvitation(user: Acceptor, token: string): Promise<{ ok: true; slug: string; eventIds: string[] } | Fail<"INVALID" | "MISMATCH" | "UNVERIFIED">> {
  return accept(user, await repo.invitationByTokenHash(getDb(), tokenHash(token)));
}

/** From the organization picker: the verified mailbox already proves what the link would. */
export async function acceptInvitationById(user: Acceptor, organizationId: string, id: string): Promise<{ ok: true; slug: string; eventIds: string[] } | Fail<"INVALID" | "MISMATCH" | "UNVERIFIED">> {
  const rows = await repo.pendingInvitationsForEmail(getDb(), normalizeEmail(user.email));
  return accept(user, rows.find((r) => r.org.id === organizationId && r.invitation.id === id));
}

export async function pendingInvitationsFor(email: string) {
  const rows = await repo.pendingInvitationsForEmail(getDb(), normalizeEmail(email));
  return rows.map((r) => ({ id: r.invitation.id, organizationId: r.org.id, orgName: r.org.name, role: r.invitation.role }));
}

export async function listInvitations(ctx: RequestContext) {
  const rows = await repo.pendingInvitations(getDb(), ctx.organizationId);
  const now = new Date();
  return rows.map((r) => ({ id: r.invitation.id, email: r.invitation.email, role: r.invitation.role, expiresAt: r.invitation.expiresAt, expired: r.invitation.expiresAt <= now, invitedBy: r.inviter }));
}
