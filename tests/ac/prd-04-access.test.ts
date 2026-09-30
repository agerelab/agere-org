// PRD-04 Roles, application access and resource ACL — acceptance criteria (§9) and model rules (§6).
import { beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { aclEntries, auditLog, teamMembers } from "@/db/schema";
import type { Db } from "@/db/client";
import { uuidv7 } from "@/lib/ids";
import { canActOn, canChangeRole, can } from "@/modules/authz/matrix";
import * as authz from "@/modules/authz/service";
import { freshDb } from "../helpers/db";
import { addMember, ctxFor, makeOrg, makeTeam, makeUser } from "../helpers/fixtures";

let db: Db;
beforeEach(async () => {
  ({ db } = await freshDb());
});

async function world() {
  const owner = await makeUser(db, "Yacobus");
  const admin = await makeUser(db, "Adi");
  const rina = await makeUser(db, "Rina");
  const budi = await makeUser(db, "Budi");
  const org = await makeOrg(owner.id);
  await addMember(db, org.id, admin.id, "admin");
  await addMember(db, org.id, rina.id);
  await addMember(db, org.id, budi.id);
  return {
    org,
    owner: ctxFor(org.id, owner.id, "owner"),
    admin: ctxFor(org.id, admin.id, "admin"),
    rina: ctxFor(org.id, rina.id, "member"),
    budi: ctxFor(org.id, budi.id, "member"),
  };
}

const project = (id = uuidv7()) => ({ type: "space.project", id });

describe("§6.2 Role × action matrix and guardrails", () => {
  it("follows the matrix", () => {
    expect(can("member", "members.invite")).toBe(false);
    expect(can("admin", "members.invite")).toBe(true);
    expect(can("admin", "org.delete")).toBe(false);
    expect(can("owner", "ownership.transfer")).toBe(true);
    expect(can("member", "members.view")).toBe(true);
  });

  it("G1: an Admin acts on Members only; only Owners grant or remove Owner", () => {
    expect(canActOn("admin", "owner")).toBe(false);
    expect(canActOn("admin", "admin")).toBe(false);
    expect(canActOn("admin", "member")).toBe(true);
    expect(canChangeRole("admin", "member", "admin")).toBe(true);
    expect(canChangeRole("admin", "member", "owner")).toBe(false);
    expect(canChangeRole("owner", "owner", "admin")).toBe(true);
    expect(canActOn("member", "member")).toBe(false);
  });
});

describe("§6.5 Application access", () => {
  it("gives every member Space in a new organization", async () => {
    const w = await world();
    expect(await authz.appAccess(db, w.rina, "space")).toBe("ok");
  });

  it("US-5: a disabled app is denied to everyone, and re-enabling restores it", async () => {
    const w = await world();
    await authz.setAppEnabled(w.admin, "space", false);
    expect(await authz.appAccess(db, w.rina, "space")).toBe("APP_DISABLED");
    expect(await authz.appAccess(db, w.owner, "space")).toBe("APP_DISABLED");
    await authz.setAppEnabled(w.admin, "space", true);
    expect(await authz.appAccess(db, w.rina, "space")).toBe("ok");
    expect((await db.select().from(auditLog)).map((a) => a.action)).toEqual(["org.organization.created", "access.app.disabled", "access.app.enabled"]);
  });

  it("revoking 'Semua anggota' keeps Owners/Admins and members with a team or direct grant", async () => {
    const w = await world();
    const sales = await makeTeam(db, w.org.id, "Tim Sales", [w.rina.userId], w.owner.userId);
    await authz.grantApp(w.admin, "space", { type: "team", id: sales });
    expect(await authz.whoLosesAppAccess(w.admin, "space", { type: "org", id: w.org.id })).toEqual([w.budi.userId]);
    await authz.revokeApp(w.admin, "space", { type: "org", id: w.org.id });
    expect(await authz.appAccess(db, w.budi, "space")).toBe("NO_APP_ACCESS");
    expect(await authz.appAccess(db, w.rina, "space")).toBe("ok");
    expect(await authz.appAccess(db, w.admin, "space")).toBe("ok");
    expect((await authz.appsOverview(w.owner))[0]).toMatchObject({ id: "space", enabled: true, everyone: false, members: 3, total: 4 });
  });
});

describe("§6.3–6.4 Resource ACL", () => {
  it("US-1: a Terbatas project is open to its principals only; others get NOT_FOUND", async () => {
    const w = await world();
    const sales = await makeTeam(db, w.org.id, "Tim Sales", [w.rina.userId], w.owner.userId);
    const p = project();
    const r = await db.transaction((tx) =>
      authz.saveAcl(tx, w.owner, p, [
        { principal: { type: "user", id: w.owner.userId }, level: "manage" },
        { principal: { type: "team", id: sales }, level: "edit" },
      ]),
    );
    expect(r.ok).toBe(true);
    expect(await authz.check(w.rina, "edit", { app: "space", chain: [p] })).toMatchObject({ allow: true, level: "edit" });
    expect(await authz.check(w.rina, "manage", { app: "space", chain: [p] })).toMatchObject({ allow: false, reason: "FORBIDDEN" });
    expect(await authz.check(w.budi, "view", { app: "space", chain: [p] })).toMatchObject({ allow: false, reason: "NOT_FOUND" });
    expect((await db.select().from(auditLog)).at(-1)?.action).toBe("access.acl.changed");
  });

  it("US-2: joining a team grants access on the next check; leaving it removes it", async () => {
    const w = await world();
    const sales = await makeTeam(db, w.org.id, "Tim Sales", [], w.owner.userId);
    const p = project();
    await db.transaction((tx) => authz.saveAcl(tx, w.owner, p, [{ principal: { type: "user", id: w.owner.userId }, level: "manage" }, { principal: { type: "team", id: sales }, level: "edit" }]));
    expect((await authz.check(w.rina, "edit", { app: "space", chain: [p] })).allow).toBe(false);
    await db.insert(teamMembers).values({ organizationId: w.org.id, teamId: sales, userId: w.rina.userId });
    expect((await authz.check(w.rina, "edit", { app: "space", chain: [p] })).allow).toBe(true);
    await db.delete(teamMembers).where(and(eq(teamMembers.teamId, sales), eq(teamMembers.userId, w.rina.userId)));
    expect(await authz.check(w.rina, "view", { app: "space", chain: [p] })).toMatchObject({ allow: false, reason: "NOT_FOUND" });
  });

  it("a project without its own ACL inherits its space; the organization principal covers every member", async () => {
    const w = await world();
    const space = { type: "space.space", id: uuidv7() };
    await db.transaction((tx) => authz.saveAcl(tx, w.owner, space, [{ principal: { type: "user", id: w.owner.userId }, level: "manage" }, { principal: { type: "org", id: w.org.id }, level: "edit" }]));
    expect(await authz.check(w.budi, "edit", { app: "space", chain: [project(), space] })).toMatchObject({ allow: true, level: "edit" });
  });

  it("US-7 / §6.6: Owners and Admins pass through the governance override, flagged for audit", async () => {
    const w = await world();
    const p = project();
    await db.transaction((tx) => authz.saveAcl(tx, w.rina, p, [{ principal: { type: "user", id: w.rina.userId }, level: "manage" }]));
    expect(await authz.check(w.admin, "manage", { app: "space", chain: [p] })).toEqual({ allow: true, level: "manage", override: true });
  });

  it("I3: an ACL without a user or team manager is rejected", async () => {
    const w = await world();
    const r = await db.transaction((tx) => authz.saveAcl(tx, w.owner, project(), [{ principal: { type: "org", id: w.org.id }, level: "manage" }]));
    expect(r).toEqual({ ok: false, code: "NO_MANAGER" });
  });

  it("I3/I4: when a team that alone managed a container is deleted, manage passes to the acting admin", async () => {
    const w = await world();
    const ops = await makeTeam(db, w.org.id, "Tim Ops", [w.rina.userId], w.owner.userId);
    const p = project();
    await db.transaction((tx) => authz.saveAcl(tx, w.owner, p, [{ principal: { type: "team", id: ops }, level: "manage" }]));
    await db.transaction((tx) => authz.removeTeamGrants(tx, w.org.id, ops, w.admin.userId));
    expect(await db.select().from(aclEntries)).toMatchObject([{ principalType: "user", principalId: w.admin.userId, level: "manage" }]);
  });

  it("US-6: fails closed when authorization cannot be evaluated", async () => {
    const w = await world();
    const broken = { select: () => { throw new Error("db down"); } } as unknown as Db;
    expect(await authz.check(w.rina, "view", { app: "space", chain: [project()] }, broken)).toEqual({ allow: false, reason: "UNAVAILABLE", level: "none" });
  });
});
