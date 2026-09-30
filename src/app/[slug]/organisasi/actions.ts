"use server";
// Server Actions for Kelola › Organisasi: Anggota, Tim, Aplikasi (PRD-03, PRD-04).
import { revalidatePath } from "next/cache";
import type { MessageKey } from "@/i18n";
import type { Role } from "@/lib/context";
import { dispatchAfterResponse } from "@/modules/events";
import { can } from "@/modules/authz/matrix";
import * as authz from "@/modules/authz/service";
import { currentSession, appUrl } from "@/modules/identity/web";
import * as invitations from "@/modules/people/invitations";
import * as members from "@/modules/people/members";
import * as teams from "@/modules/people/teams";
import { requireOrg } from "@/modules/org/web";

export type ActionState = { ok: true; message?: MessageKey; args?: string[] } | { ok: false; error: MessageKey; args?: string[]; reauth?: boolean };

const ERRORS: Record<string, MessageKey> = {
  FORBIDDEN: "people.error.forbidden",
  NOT_FOUND: "people.error.notFound",
  LAST_OWNER: "people.error.lastOwner",
  BAD_TARGET: "people.error.badTarget",
  TOO_MANY: "invite.tooMany",
  EMPTY: "auth.error.required",
  TAKEN: "team.error.taken",
  INVALID: "team.error.name",
};

function done(slug: string, r: { ok: true; eventIds: string[] } | { ok: false; code: string }, message?: MessageKey, args?: string[]): ActionState {
  if (!r.ok) {
    if (r.code === "UNCHANGED") return { ok: true };
    if (r.code === "REAUTH_REQUIRED") return { ok: false, error: "reauth.body", reauth: true };
    return { ok: false, error: ERRORS[r.code] ?? "people.error.generic" };
  }
  dispatchAfterResponse(r.eventIds);
  revalidatePath(`/${slug}`, "layout");
  return { ok: true, message, args };
}

async function sender(slug: string) {
  const page = await requireOrg(slug);
  return { page, sender: { name: page.user.name, orgName: page.org.name, appUrl: await appUrl(), locale: page.org.defaultLocale } };
}

// ---------- members ----------

export async function inviteAction(slug: string, raw: string, role: "member" | "admin"): Promise<ActionState> {
  const { page, sender: s } = await sender(slug);
  const { valid, invalid } = invitations.parseEmails(raw);
  if (invalid.length) return { ok: false, error: "invite.badEmail", args: [invalid.join(", ")] };
  try {
    const r = await invitations.invite(page.ctx, { emails: valid, role }, s);
    if (!r.ok) return done(slug, r);
    const by = (k: string) => r.outcomes.filter((o) => o.result === k).map((o) => o.email);
    const sent = by("invited");
    const res = done(slug, r, sent.length ? "invite.sent" : by("pending").length ? "invite.pending" : "invite.members", [
      (sent.length ? sent : by("pending").length ? by("pending") : by("already_member")).join(", "),
    ]);
    return res;
  } catch (e) {
    console.error("[people] invite", e);
    return { ok: false, error: "people.error.inviteFailed" };
  }
}

export async function resendAction(slug: string, id: string): Promise<ActionState> {
  const { page, sender: s } = await sender(slug);
  return done(slug, await invitations.resendInvitation(page.ctx, id, s), "resend.done");
}

export async function revokeAction(slug: string, id: string): Promise<ActionState> {
  const page = await requireOrg(slug);
  return done(slug, await invitations.revokeInvitation(page.ctx, id), "revoke.done");
}

export async function changeRoleAction(slug: string, userId: string, role: Role): Promise<ActionState> {
  const page = await requireOrg(slug);
  const s = await currentSession();
  return done(slug, await members.changeRole(page.ctx, userId, role, s?.lastAuthAt ?? new Date(0)), "roleDialog.done");
}

export async function suspendAction(slug: string, userId: string, name: string): Promise<ActionState> {
  const page = await requireOrg(slug);
  return done(slug, await members.suspend(page.ctx, userId), "suspend.done", [name]);
}

export async function reactivateAction(slug: string, userId: string, name: string): Promise<ActionState> {
  const page = await requireOrg(slug);
  return done(slug, await members.reactivate(page.ctx, userId), "reactivate.done", [name]);
}

export async function handoverAction(slug: string, userId: string) {
  const page = await requireOrg(slug);
  if (!can(page.ctx.role, "members.manage")) return [];
  return members.previewWorkHandover(page.ctx, userId);
}

export async function removeAction(slug: string, userId: string, name: string, targets: Record<string, string>): Promise<ActionState> {
  const page = await requireOrg(slug);
  try {
    return done(slug, await members.removeMember(page.ctx, userId, targets), "remove.done", [name]);
  } catch (e) {
    console.error("[people] remove", e);
    return { ok: false, error: "people.error.removeFailed" };
  }
}

export async function leaveAction(slug: string): Promise<ActionState> {
  const page = await requireOrg(slug);
  const r = await members.leave(page.ctx);
  if (!r.ok) return done(slug, r);
  dispatchAfterResponse(r.eventIds);
  return { ok: true };
}

// ---------- teams ----------

export async function createTeamAction(slug: string, name: string): Promise<ActionState & { id?: string }> {
  const page = await requireOrg(slug);
  const r = await teams.createTeam(page.ctx, name);
  return { ...done(slug, r, "team.saved"), id: r.ok ? r.id : undefined };
}

export async function renameTeamAction(slug: string, id: string, name: string): Promise<ActionState> {
  const page = await requireOrg(slug);
  return done(slug, await teams.renameTeam(page.ctx, id, name), "team.saved");
}

export async function setTeamMembersAction(slug: string, id: string, userIds: string[]): Promise<ActionState> {
  const page = await requireOrg(slug);
  return done(slug, await teams.setTeamMembers(page.ctx, id, userIds), "team.saved");
}

export async function teamImpactAction(slug: string, id: string) {
  const page = await requireOrg(slug);
  return teams.teamDeletionImpact(page.ctx, id);
}

export async function deleteTeamAction(slug: string, id: string): Promise<ActionState> {
  const page = await requireOrg(slug);
  return done(slug, await teams.deleteTeam(page.ctx, id), "team.deleted");
}

// ---------- apps (PRD-04 §6.5) ----------

export async function setAppEnabledAction(slug: string, app: string, enabled: boolean): Promise<ActionState> {
  const page = await requireOrg(slug);
  if (!can(page.ctx.role, "apps.manage")) return { ok: false, error: "people.error.forbidden" };
  return done(slug, { ok: true, eventIds: await authz.setAppEnabled(page.ctx, app, enabled) }, "apps.saved");
}

export async function everyoneImpactAction(slug: string, app: string): Promise<number> {
  const page = await requireOrg(slug);
  if (!can(page.ctx.role, "apps.manage")) return 0;
  return (await authz.whoLosesAppAccess(page.ctx, app, { type: "org", id: page.org.id })).length;
}

export async function setEveryoneAction(slug: string, app: string, on: boolean): Promise<ActionState> {
  const page = await requireOrg(slug);
  if (!can(page.ctx.role, "apps.manage")) return { ok: false, error: "people.error.forbidden" };
  const principal = { type: "org" as const, id: page.org.id };
  const ids = on ? await authz.grantApp(page.ctx, app, principal) : await authz.revokeApp(page.ctx, app, principal);
  return done(slug, { ok: true, eventIds: ids }, "apps.saved");
}
