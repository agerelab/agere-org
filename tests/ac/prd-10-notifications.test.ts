// PRD-10 Notifications (Desk › Kotak masuk) — acceptance criteria (§8) and the §5 rule table.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { notifications, tasks, users } from "@/db/schema";
import type { Db } from "@/db/client";
import { dispatch } from "@/modules/events";
import { setEmailSender, type OutgoingEmail } from "@/modules/identity/email";
import { archive, dueTodayDigest, handleNotification, inbox, markAllRead, open, unreadCount } from "@/modules/notifications";
import { purgeOld } from "@/modules/notifications/repository";
import { changeRole, removeMember, suspend } from "@/modules/people/members";
import { createSpace } from "@/modules/space/spaces";
import { createProject, setProjectStatus } from "@/modules/space/projects";
import { addComment, createTask, updateTask } from "@/modules/space/tasks";
import { saveSharing } from "@/modules/space/sharing";
import { getEvent } from "@/modules/events/repository";
import { freshDb } from "../helpers/db";
import { addMember, ctxFor, makeOrg, makeTeam, makeUser } from "../helpers/fixtures";

let db: Db;
let mail: OutgoingEmail[] = [];
beforeEach(async () => {
  ({ db } = await freshDb());
  mail = [];
  setEmailSender(async (m) => void mail.push(m));
});
afterEach(() => setEmailSender(undefined));

async function world() {
  const owner = await makeUser(db, "Yacobus");
  const rina = await makeUser(db, "Rina");
  const budi = await makeUser(db, "Budi");
  const org = await makeOrg(owner.id);
  await addMember(db, org.id, rina.id);
  await addMember(db, org.id, budi.id);
  const w = { org, owner: ctxFor(org.id, owner.id, "owner"), rina: ctxFor(org.id, rina.id, "member"), budi: ctxFor(org.id, budi.id, "member") };
  const s = await createSpace(w.owner, { name: "Marketing", iconKey: "megaphone", description: "", access: "org" });
  if (!s.ok) throw new Error(s.code);
  const p = await createProject(w.owner, s.id, { name: "Q4 Launch" }, "id");
  if (!p.ok) throw new Error(p.code);
  return { ...w, spaceId: s.id, projectId: p.id };
}

/** Delivers events the way the fast path does after the response. */
const deliver = async (ids: string[]) => {
  for (const id of ids) await dispatch(id);
};
const items = () => db.select().from(notifications);

describe("US-1 — Assignment notification", () => {
  it("creates exactly one item for the assignee, linking to the task; none for self-assignment", async () => {
    const w = await world();
    const t = await createTask(w.owner, w.projectId, { title: "Riset harga", assignee: { type: "user", id: w.rina.userId } });
    if (!t.ok) throw new Error();
    await deliver(t.eventIds);
    const rows = await items();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ recipientUserId: w.rina.userId, type: "task_assigned", forMe: true, vars: { actor: "Yacobus", task: "Riset harga", project: "Q4 Launch" } });
    expect(rows[0].targetUrl).toBe(`/maju-jaya/s/${w.spaceId}/${w.projectId}/papan?task=${t.id}`);
    const self = await createTask(w.rina, w.projectId, { title: "Catatan", assignee: { type: "user", id: w.rina.userId } });
    if (!self.ok) throw new Error();
    await deliver(self.eventIds);
    expect(await items()).toHaveLength(1);
  });

  it("notifies the members of an assigned team who can view the project, not the actor", async () => {
    const w = await world();
    const sales = await makeTeam(db, w.org.id, "Tim Sales", [w.rina.userId, w.budi.userId, w.owner.userId], w.owner.userId);
    const t = await createTask(w.owner, w.projectId, { title: "Proposal", assignee: { type: "team", id: sales } });
    if (!t.ok) throw new Error();
    await deliver(t.eventIds);
    expect((await items()).map((r) => [r.recipientUserId, r.type, r.vars.team]).sort()).toEqual(
      [[w.budi.userId, "task_assigned_team", "Tim Sales"], [w.rina.userId, "task_assigned_team", "Tim Sales"]].sort(),
    );
  });
});

describe("US-2 — No duplicates (PRD-00b D5)", () => {
  it("a retried delivery still leaves one item", async () => {
    const w = await world();
    const t = await createTask(w.owner, w.projectId, { title: "Riset harga", assignee: { type: "user", id: w.rina.userId } });
    if (!t.ok) throw new Error();
    await deliver(t.eventIds);
    const event = (await getEvent(db, t.eventIds.at(-1)!))!;
    await handleNotification(event);
    await handleNotification(event);
    expect(await items()).toHaveLength(1);
  });
});

describe("US-3 / US-7 / US-8 — Read, archive, tabs", () => {
  async function five() {
    const w = await world();
    const ids: string[] = [];
    for (const title of ["A", "B", "C"]) {
      const t = await createTask(w.owner, w.projectId, { title, assignee: { type: "user", id: w.rina.userId } });
      if (!t.ok) throw new Error();
      ids.push(t.id);
      await deliver(t.eventIds);
    }
    const r = await changeRole(w.owner, w.rina.userId, "admin", new Date());
    if (!("eventIds" in r)) throw new Error(JSON.stringify(r));
    await deliver(r.eventIds);
    return { w, ids };
  }

  it("opening marks read; Tandai semua dibaca reads every visible item", async () => {
    const { w } = await five();
    const rina = { ...w.rina, role: "admin" as const };
    expect(await unreadCount(rina)).toBe(4);
    const first = (await inbox(rina)).items[0];
    expect(await open(rina, first.id)).toBeTruthy();
    expect(await unreadCount(rina)).toBe(3);
    expect(await markAllRead(rina)).toBe(3);
    expect(await unreadCount(rina)).toBe(0);
  });

  it("tabs count Semua, Belum dibaca and Untuk saya; archive leaves every tab", async () => {
    const { w } = await five();
    const rina = { ...w.rina, role: "admin" as const };
    const box = await inbox(rina);
    expect(box.counts).toEqual({ all: 4, unread: 4, forMe: 3 });
    expect(box.items.map((i) => i.kind)).toEqual(["role_changed", "task_assigned", "task_assigned", "task_assigned"]);
    expect((await inbox(rina, "forMe")).items.every((i) => i.kind === "task_assigned")).toBe(true);
    expect(await archive(rina, box.items[1].id)).toBe(true);
    expect((await inbox(rina)).counts).toEqual({ all: 3, unread: 3, forMe: 2 });
    expect(await unreadCount(rina)).toBe(3);
  });
});

describe("US-4 — Access lost", () => {
  it("hides items about a project the reader can no longer view, and shows them again when access returns", async () => {
    const w = await world();
    const t = await createTask(w.owner, w.projectId, { title: "Riset harga", assignee: { type: "user", id: w.rina.userId } });
    if (!t.ok) throw new Error();
    await deliver(t.eventIds);
    const only = (ids: string[]) => ({ everyone: false, entries: ids.map((id) => ({ principal: { type: "user" as const, id }, level: "manage" as const })) });
    await saveSharing(w.owner, { kind: "project", id: w.projectId }, only([w.owner.userId]));
    expect(await unreadCount(w.rina)).toBe(0);
    expect((await inbox(w.rina)).items).toHaveLength(0);
    await saveSharing(w.owner, { kind: "project", id: w.projectId }, only([w.owner.userId, w.rina.userId]));
    expect(await unreadCount(w.rina)).toBe(1);
  });

  it("opening an item whose task went to Sampah shows the missing-item state", async () => {
    const w = await world();
    const t = await createTask(w.owner, w.projectId, { title: "Riset harga", assignee: { type: "user", id: w.rina.userId } });
    if (!t.ok) throw new Error();
    await deliver(t.eventIds);
    await db.update(tasks).set({ deletedAt: new Date() }).where(eq(tasks.id, t.id));
    const [item] = await items();
    expect(await open(w.rina, item.id)).toBeNull();
  });
});

describe("US-5 — Bulk summary", () => {
  it("12 reassigned tasks give the target one summary and no per-task items", async () => {
    const w = await world();
    const ids: string[] = [];
    for (let i = 0; i < 12; i++) {
      const t = await createTask(w.budi, w.projectId, { title: `T${i}`, assignee: { type: "user", id: w.budi.userId } });
      if (!t.ok) throw new Error();
      ids.push(...t.eventIds);
    }
    await deliver(ids);
    const r = await removeMember(w.owner, w.budi.userId, { space: w.rina.userId });
    if (!r.ok) throw new Error();
    await deliver(r.eventIds);
    const all = await items();
    expect(all.map((x) => [x.recipientUserId, x.type, x.vars.count, x.vars.from])).toEqual([[w.rina.userId, "work_reassigned", 12, "Budi"]]);
  });
});

describe("US-6 — Account-critical email", () => {
  it("a suspended member gets one email in their language and no in-app item", async () => {
    const w = await world();
    await db.update(users).set({ locale: "en" }).where(eq(users.id, w.budi.userId));
    const r = await suspend(w.owner, w.budi.userId);
    if (!r.ok) throw new Error();
    await deliver(r.eventIds);
    await handleNotification((await getEvent(db, r.eventIds[0]))!);
    expect(mail.map((m) => [m.to, m.subject])).toEqual([["budi@maju.co.id", "Your access to Maju Jaya is suspended"]]);
    expect(await items()).toHaveLength(0);
  });
});

describe("Mentions and project status (§5 Should rows)", () => {
  it("notifies people mentioned by name who can view the project", async () => {
    const w = await world();
    const t = await createTask(w.owner, w.projectId, { title: "Moodboard" });
    if (!t.ok) throw new Error();
    const outsider = await makeUser(db, "Rina Kusuma");
    await addMember(db, w.org.id, outsider.id, "member", "suspended");
    const c = await addComment(w.owner, t.id, "@Rina tolong cek, dan @Budi juga ya");
    if (!c.ok) throw new Error();
    await deliver(c.eventIds);
    expect((await items()).map((r) => [r.recipientUserId, r.type]).sort()).toEqual([[w.budi.userId, "comment_mention"], [w.rina.userId, "comment_mention"]].sort());
  });

  it("tells the project lead when someone else changes the status", async () => {
    const w = await world();
    await saveSharing(w.owner, { kind: "project", id: w.projectId }, { everyone: true, entries: [{ principal: { type: "user", id: w.owner.userId }, level: "manage" }, { principal: { type: "user", id: w.rina.userId }, level: "manage" }] });
    const r = await setProjectStatus(w.rina, w.projectId, { status: "at_risk", targetDate: null, note: "", ownerUserId: w.owner.userId });
    if (!r.ok) throw new Error(r.code);
    await deliver(r.eventIds);
    expect((await items()).map((x) => [x.recipientUserId, x.type, x.vars.status])).toEqual([[w.owner.userId, "project_status", "at_risk"]]);
  });
});

describe("Digest and retention (§6)", () => {
  it("creates one 'due today' item at 08.00 organization time, once per day", async () => {
    const w = await world();
    const eight = new Date("2026-10-01T01:00:00Z"); // 08.00 Asia/Jakarta
    const t = await createTask(w.owner, w.projectId, { title: "Banner", assignee: { type: "user", id: w.rina.userId }, dueDate: "2026-10-01" });
    if (!t.ok) throw new Error();
    expect(await dueTodayDigest(new Date("2026-10-01T02:00:00Z"))).toBe(0);
    expect(await dueTodayDigest(eight)).toBe(1);
    expect(await dueTodayDigest(eight)).toBe(0);
    const [d] = (await items()).filter((x) => x.type === "due_today");
    expect(d).toMatchObject({ recipientUserId: w.rina.userId, vars: { count: 1 }, targetUrl: "/maju-jaya/desk/tugas-saya" });
  });

  it("purges items older than 90 days", async () => {
    const w = await world();
    const t = await createTask(w.owner, w.projectId, { title: "Lama", assignee: { type: "user", id: w.rina.userId } });
    if (!t.ok) throw new Error();
    await deliver(t.eventIds);
    await db.update(notifications).set({ createdAt: sql`now() - interval '91 days'` });
    expect(await purgeOld(db)).toBe(1);
  });

  it("an edit that does not change the assignee notifies nobody", async () => {
    const w = await world();
    const t = await createTask(w.owner, w.projectId, { title: "X", assignee: { type: "user", id: w.rina.userId } });
    if (!t.ok) throw new Error();
    const [row] = await db.select().from(tasks).where(eq(tasks.id, t.id));
    const u = await updateTask(w.owner, t.id, row.version, { title: "Y" });
    if (!u.ok) throw new Error();
    await deliver([...t.eventIds, ...u.eventIds]);
    expect(await items()).toHaveLength(1);
  });
});
