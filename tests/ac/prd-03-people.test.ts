// PRD-03 People & Teams — acceptance criteria (§9) and rules (§6).
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { aclEntries, appGrants, auditLog, invitations, memberships, outboxEvents, teamMembers, teams } from "@/db/schema";
import type { Db } from "@/db/client";
import { uuidv7 } from "@/lib/ids";
import { saveAcl, grantApp } from "@/modules/authz/service";
import { registerWorkProvider, unregisterWorkProvider } from "@/modules/authz/work";
import { setEmailSender, type OutgoingEmail } from "@/modules/identity/email";
import { acceptInvitation, acceptInvitationById, invite, lookupInvitation, parseEmails, pendingInvitationsFor, resendInvitation, revokeInvitation } from "@/modules/people/invitations";
import { landingPath } from "@/modules/org/service";
import { changeRole, leave, listMembers, previewWorkHandover, reactivate, removeMember, suspend } from "@/modules/people/members";
import { createTeam, deleteTeam, renameTeam, setTeamMembers } from "@/modules/people/teams";
import { resolveOrg } from "@/modules/org/service";
import { freshDb } from "../helpers/db";
import { addMember, ctxFor, makeOrg, makeTeam, makeUser } from "../helpers/fixtures";

let db: Db;
let outbox: OutgoingEmail[];
const sender = { name: "Adi", orgName: "Maju Jaya", appUrl: "https://org.agere.test", locale: "en" as const };
const tokenOf = (m: OutgoingEmail) => new URL(m.text.match(/https:\/\/\S+/)![0]).searchParams.get("token")!;
const recent = new Date();

beforeEach(async () => {
  ({ db } = await freshDb());
  outbox = [];
  setEmailSender(async (m) => void outbox.push(m));
});
afterEach(() => {
  setEmailSender(undefined);
  unregisterWorkProvider("space");
});

async function world() {
  const owner = await makeUser(db, "Yacobus");
  const admin = await makeUser(db, "Adi");
  const budi = await makeUser(db, "Budi");
  const org = await makeOrg(owner.id);
  await addMember(db, org.id, admin.id, "admin");
  await addMember(db, org.id, budi.id);
  return { org, owner: ctxFor(org.id, owner.id, "owner"), admin: ctxFor(org.id, admin.id, "admin"), budi: ctxFor(org.id, budi.id, "member") };
}

describe("US-1 — Invite a member", () => {
  it("creates a 7-day pending invitation, sends the email and audits it", async () => {
    const w = await world();
    const r = await invite(w.admin, { emails: ["Dewi@Maju.co.id"], role: "member" }, sender);
    expect(r).toMatchObject({ ok: true, outcomes: [{ email: "dewi@maju.co.id", result: "invited" }] });
    const [inv] = await db.select().from(invitations);
    expect(inv.expiresAt.getTime() - Date.now()).toBeGreaterThan(6.9 * 24 * 3600 * 1000);
    expect(outbox.map((m) => m.to)).toEqual(["dewi@maju.co.id"]);
    const audit = (await db.select().from(auditLog)).find((a) => a.action === "membership.invitation.created")!;
    expect(audit.after).toMatchObject({ email_hash: "[redacted]" });
  });

  it("offers a resend instead of a duplicate, skips existing members, and refuses Members", async () => {
    const w = await world();
    await invite(w.admin, { emails: ["dewi@maju.co.id"], role: "member" }, sender);
    const again = await invite(w.admin, { emails: ["dewi@maju.co.id", "budi@maju.co.id"], role: "member" }, sender);
    expect(again).toMatchObject({ ok: true, outcomes: [{ result: "pending" }, { result: "already_member" }] });
    expect(await db.select().from(invitations)).toHaveLength(1);
    expect(await invite(w.budi, { emails: ["x@maju.co.id"], role: "member" }, sender)).toEqual({ ok: false, code: "FORBIDDEN" });
  });

  it("parses up to 20 emails separated by commas or new lines", async () => {
    expect(parseEmails("a@x.id, B@x.id\nbad-email;a@x.id")).toEqual({ valid: ["a@x.id", "b@x.id"], invalid: ["bad-email"] });
    const w = await world();
    const many = Array.from({ length: 21 }, (_, i) => `p${i}@x.id`);
    expect(await invite(w.admin, { emails: many, role: "member" }, sender)).toEqual({ ok: false, code: "TOO_MANY" });
  });
});

describe("US-2 — Accept an invitation", () => {
  it("activates the membership with the invited role for the matching verified email", async () => {
    const w = await world();
    await invite(w.admin, { emails: ["dewi@maju.co.id"], role: "admin" }, sender);
    const dewi = await makeUser(db, "Dewi");
    const r = await acceptInvitation(dewi, tokenOf(outbox[0]));
    expect(r).toMatchObject({ ok: true, slug: "maju-jaya" });
    expect(await resolveOrg("maju-jaya", dewi.id)).toMatchObject({ ok: true, role: "admin" });
    expect(await lookupInvitation(tokenOf(outbox[0]))).toMatchObject({ state: "accepted" });
  });

  it("refuses an expired, revoked or superseded link, and a different email", async () => {
    const w = await world();
    await invite(w.admin, { emails: ["dewi@maju.co.id"], role: "member" }, sender);
    const dewi = await makeUser(db, "Dewi");
    const other = await makeUser(db, "Rina");
    const first = tokenOf(outbox[0]);
    expect(await acceptInvitation(other, first)).toEqual({ ok: false, code: "MISMATCH" });
    const [inv] = await db.select().from(invitations);
    await resendInvitation(w.admin, inv.id, sender);
    expect(await acceptInvitation(dewi, first)).toEqual({ ok: false, code: "INVALID" });
    const second = tokenOf(outbox[1]);
    await db.update(invitations).set({ expiresAt: new Date(Date.now() - 1000) });
    expect(await lookupInvitation(second)).toMatchObject({ state: "expired" });
    expect(await acceptInvitation(dewi, second)).toEqual({ ok: false, code: "INVALID" });
    await db.update(invitations).set({ expiresAt: new Date(Date.now() + 60_000) });
    await revokeInvitation(w.admin, inv.id);
    expect(await acceptInvitation(dewi, second)).toEqual({ ok: false, code: "INVALID" });
    expect(await resolveOrg("maju-jaya", dewi.id)).toEqual({ ok: false, code: "NOT_FOUND" });
  });
});

describe("Pending invitations at landing (PRD-02 §6.2 step 5)", () => {
  it("sends a new account with an invitation to the picker, where it can be accepted", async () => {
    const w = await world();
    await invite(w.admin, { emails: ["dewi@maju.co.id"], role: "member" }, sender);
    const dewi = await makeUser(db, "Dewi");
    expect(await landingPath({ id: dewi.id, email: dewi.email, lastOrganizationId: null })).toBe("/pilih-organisasi");
    const [pending] = await pendingInvitationsFor(dewi.email);
    expect(pending).toMatchObject({ orgName: "Maju Jaya", role: "member" });
    const stranger = await makeUser(db, "Rina");
    expect(await acceptInvitationById(stranger, pending.organizationId, pending.id)).toEqual({ ok: false, code: "INVALID" });
    expect(await acceptInvitationById(dewi, pending.organizationId, pending.id)).toMatchObject({ ok: true, slug: "maju-jaya" });
    expect(await landingPath({ id: dewi.id, email: dewi.email, lastOrganizationId: null })).toBe("/maju-jaya");
  });
});

describe("US-3 — Remove with reassignment", () => {
  function fakeSpace(tasks: Map<string, string>, fail = false) {
    registerWorkProvider({
      app: "space",
      countOpenWork: async (_q, _o, u) => [...tasks.values()].filter((a) => a === u).length,
      reassignOpenWork: async (_tx, _o, from, to) => {
        if (fail) throw new Error("reassign failed");
        let n = 0;
        for (const [k, v] of tasks) {
          if (v !== from) continue;
          tasks.set(k, to);
          n++;
        }
        return n;
      },
    });
  }

  it("removes, reassigns and deletes direct grants and teams in one transaction", async () => {
    const w = await world();
    const tasks = new Map(Array.from({ length: 12 }, (_, i) => [`t${i}`, w.budi.userId]));
    fakeSpace(tasks);
    const project = { type: "space.project", id: uuidv7() };
    await db.transaction((tx) => saveAcl(tx, w.budi, project, [{ principal: { type: "user", id: w.budi.userId }, level: "manage" }]));
    await grantApp(w.admin, "space", { type: "user", id: w.budi.userId });
    await makeTeam(db, w.org.id, "Tim Sales", [w.budi.userId], w.owner.userId);
    expect(await previewWorkHandover(w.admin, w.budi.userId)).toEqual(expect.arrayContaining([{ app: "access", count: 1 }, { app: "space", count: 12 }]));

    expect(await removeMember(w.admin, w.budi.userId)).toMatchObject({ ok: true });
    expect([...tasks.values()].every((v) => v === w.admin.userId)).toBe(true);
    expect(await db.select().from(aclEntries)).toMatchObject([{ principalType: "user", principalId: w.admin.userId, level: "manage" }]);
    expect((await db.select().from(appGrants)).some((g) => g.principalId === w.budi.userId)).toBe(false);
    expect(await db.select().from(teamMembers)).toHaveLength(0);
    expect(await resolveOrg("maju-jaya", w.budi.userId)).toEqual({ ok: false, code: "NOT_FOUND" });
    const types = (await db.select().from(outboxEvents)).map((e) => e.type);
    expect(types).toContain("membership.member.removed");
    expect(types.filter((t) => t === "membership.work.reassigned")).toHaveLength(1);
  });

  it("changes nothing when a reassignment fails (R2)", async () => {
    const w = await world();
    fakeSpace(new Map([["t1", w.budi.userId]]), true);
    await expect(removeMember(w.admin, w.budi.userId)).rejects.toThrow("reassign failed");
    expect(await resolveOrg("maju-jaya", w.budi.userId)).toMatchObject({ ok: true });
  });

  it("refuses targets that are not active members, and Admins removing Owners or Admins (G1)", async () => {
    const w = await world();
    fakeSpace(new Map());
    expect(await removeMember(w.admin, w.budi.userId, { space: uuidv7() })).toEqual({ ok: false, code: "BAD_TARGET" });
    expect(await removeMember(w.admin, w.owner.userId)).toEqual({ ok: false, code: "FORBIDDEN" });
    expect(await removeMember(w.budi, w.admin.userId)).toEqual({ ok: false, code: "FORBIDDEN" });
  });
});

describe("US-4 — Suspend and reactivate", () => {
  it("keeps grants and teams while suspended, and restores access on reactivation", async () => {
    const w = await world();
    await makeTeam(db, w.org.id, "Tim Ops", [w.budi.userId], w.owner.userId);
    await suspend(w.admin, w.budi.userId);
    expect(await resolveOrg("maju-jaya", w.budi.userId)).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(await db.select().from(teamMembers)).toHaveLength(1);
    expect((await listMembers(w.admin)).find((m) => m.userId === w.budi.userId)?.status).toBe("suspended");
    await reactivate(w.admin, w.budi.userId);
    expect(await resolveOrg("maju-jaya", w.budi.userId)).toMatchObject({ ok: true });
  });
});

describe("Roles and the last-Owner rule (PRD-02 US-3, PRD-04 G2–G4)", () => {
  it("blocks the last Owner from leaving or stepping down", async () => {
    const w = await world();
    expect(await leave(w.owner)).toEqual({ ok: false, code: "LAST_OWNER" });
    expect(await changeRole(w.owner, w.owner.userId, "admin", recent)).toEqual({ ok: false, code: "LAST_OWNER" });
  });

  it("requires recent authentication to promote to Owner, and only Owners may do it", async () => {
    const w = await world();
    expect(await changeRole(w.admin, w.budi.userId, "owner", recent)).toEqual({ ok: false, code: "FORBIDDEN" });
    expect(await changeRole(w.owner, w.budi.userId, "owner", new Date(Date.now() - 30 * 60_000))).toEqual({ ok: false, code: "REAUTH_REQUIRED" });
    expect(await changeRole(w.owner, w.budi.userId, "owner", recent)).toMatchObject({ ok: true });
    expect((await db.select().from(auditLog)).at(-1)).toMatchObject({ action: "access.role.changed", before: { role: "member" }, after: { role: "owner" } });
    // With a second Owner the first may step down, and then leave.
    expect(await changeRole(w.owner, w.owner.userId, "admin", recent)).toMatchObject({ ok: true });
  });

  it("lets Admins move Members to Admin but never touch another Admin (G1), and nobody changes their own role", async () => {
    const w = await world();
    expect(await changeRole(w.admin, w.budi.userId, "admin", recent)).toMatchObject({ ok: true });
    expect(await changeRole(w.admin, w.budi.userId, "member", recent)).toEqual({ ok: false, code: "FORBIDDEN" });
    expect(await changeRole(w.admin, w.admin.userId, "owner", recent)).toEqual({ ok: false, code: "FORBIDDEN" });
  });

  it("R3: a member leaving hands open work to the earliest-joined Owner", async () => {
    const w = await world();
    const tasks = new Map([["t1", w.budi.userId]]);
    registerWorkProvider({ app: "space", countOpenWork: async () => 1, reassignOpenWork: async (_t, _o, f, to) => (tasks.set("t1", to), 1) });
    expect(await leave(w.budi)).toMatchObject({ ok: true });
    expect(tasks.get("t1")).toBe(w.owner.userId);
    expect((await db.select().from(memberships)).map((m) => m.userId)).not.toContain(w.budi.userId);
  });

  it("hides other members' emails from Members", async () => {
    const w = await world();
    const seen = await listMembers(w.budi);
    expect(seen.find((m) => m.userId === w.admin.userId)?.email).toBeNull();
    expect(seen.find((m) => m.userId === w.budi.userId)?.email).toBe("budi@maju.co.id");
    expect((await listMembers(w.admin)).find((m) => m.userId === w.budi.userId)?.email).toBe("budi@maju.co.id");
  });
});

describe("Teams (§6.4, US-6)", () => {
  it("keeps names unique case-insensitively and records membership changes", async () => {
    const w = await world();
    const r = await createTeam(w.admin, "Tim Sales");
    expect(r.ok).toBe(true);
    expect(await createTeam(w.admin, "tim sales")).toEqual({ ok: false, code: "TAKEN" });
    expect(await createTeam(w.budi, "Tim Ops")).toEqual({ ok: false, code: "FORBIDDEN" });
    const id = r.ok ? r.id : "";
    expect(await renameTeam(w.admin, id, "Tim Penjualan")).toMatchObject({ ok: true });
    expect(await setTeamMembers(w.admin, id, [w.budi.userId, w.admin.userId])).toMatchObject({ ok: true, eventIds: expect.any(Array) });
    expect(await setTeamMembers(w.admin, id, [w.budi.userId])).toMatchObject({ ok: true });
    expect(await setTeamMembers(w.admin, id, [uuidv7()])).toEqual({ ok: false, code: "INVALID" });
    const actions = (await db.select().from(auditLog)).map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(["team.team.created", "team.team.renamed", "team.member.added", "team.member.removed"]));
  });

  it("deleting a team removes its grants and keeps a manager on containers it managed", async () => {
    const w = await world();
    const ops = await makeTeam(db, w.org.id, "Tim Ops", [w.budi.userId], w.owner.userId);
    const project = { type: "space.project", id: uuidv7() };
    await db.transaction((tx) => saveAcl(tx, w.owner, project, [{ principal: { type: "team", id: ops }, level: "manage" }]));
    await grantApp(w.admin, "space", { type: "team", id: ops });
    expect(await deleteTeam(w.admin, ops)).toMatchObject({ ok: true });
    expect(await db.select().from(teams).where(eq(teams.id, ops))).toHaveLength(0);
    expect((await db.select().from(appGrants)).some((g) => g.principalType === "team")).toBe(false);
    expect(await db.select().from(aclEntries)).toMatchObject([{ principalType: "user", principalId: w.admin.userId, level: "manage" }]);
  });
});
