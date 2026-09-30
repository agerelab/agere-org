// PRD-06 Space, second part (M3b): Bagikan (PRD-04 §8.1), project status (US-11), Sampah (US-7,
// US-15, PRD-13 US-1), bulk actions (US-18), uploaded icons (US-14), Titik mulai (PRD-02 US-1b),
// Ringkasan and the Members tab (v2.2).
import { beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { auditLog, boardColumns, outboxEvents, projects, spaces, tasks } from "@/db/schema";
import type { Db } from "@/db/client";
import { createSpace, deleteSpace, updateSpace } from "@/modules/space/spaces";
import { createProject, deleteColumn, deleteProject, setProjectStatus } from "@/modules/space/projects";
import { assignTasks, completeTasks, createTask, deleteTask, moveTask } from "@/modules/space/tasks";
import { projectHeader, projectKpis, projectMembers, spaceTree } from "@/modules/space/queries";
import { saveSharing, shareInfo } from "@/modules/space/sharing";
import { purgeTrash, restore, trashList } from "@/modules/space/trash";
import { sanitizeSvg, uploadSpaceIcon } from "@/modules/space/assets";
import { seedPreset } from "@/modules/space/presets";
import { createOrganization } from "@/modules/org/service";
import { checkProject, checkSpace } from "@/modules/space/access";
import * as repo from "@/modules/space/repository";
import { freshDb } from "../helpers/db";
import { addMember, ctxFor, makeOrg, makeTeam, makeUser } from "../helpers/fixtures";

let db: Db;
const today = "2026-09-30";
beforeEach(async () => {
  ({ db } = await freshDb());
});

async function world() {
  const owner = await makeUser(db, "Yacobus");
  const rina = await makeUser(db, "Rina");
  const budi = await makeUser(db, "Budi");
  const org = await makeOrg(owner.id);
  await addMember(db, org.id, rina.id);
  await addMember(db, org.id, budi.id);
  const w = { org, owner: ctxFor(org.id, owner.id, "owner"), rina: ctxFor(org.id, rina.id, "member"), budi: ctxFor(org.id, budi.id, "member") };
  const s = await createSpace(w.rina, { name: "Marketing", iconKey: "megaphone", description: "", access: "org" });
  if (!s.ok) throw new Error(s.code);
  return { ...w, spaceId: s.id };
}

async function project(ctx: ReturnType<typeof ctxFor>, spaceId: string, name = "Q4 Launch") {
  const p = await createProject(ctx, spaceId, { name }, "id");
  if (!p.ok) throw new Error(p.code);
  return p;
}

const cols = async (boardId: string) => db.select().from(boardColumns).where(eq(boardColumns.boardId, boardId));
const ref = async (orgId: string, id: string) => (await repo.project(db, orgId, id))!;
const task = async (ctx: ReturnType<typeof ctxFor>, projectId: string, title: string, extra = {}) => {
  const r = await createTask(ctx, projectId, { title, ...extra });
  if (!r.ok) throw new Error(r.code);
  return r.id;
};

describe("Bagikan (PRD-04 v1.5 §8.1)", () => {
  it("turning a space's organization switch off leaves only its listed principals", async () => {
    const w = await world();
    const info = await shareInfo(w.rina, { kind: "space", id: w.spaceId });
    expect(info.ok && info.info).toMatchObject({ canManage: true, everyone: true, entries: [{ name: "Rina", level: "manage" }] });
    expect(info.ok && info.info.people.map((p) => p.name).sort()).toEqual(["Budi", "Rina", "Yacobus"]);
    expect(await saveSharing(w.rina, { kind: "space", id: w.spaceId }, { everyone: false, entries: [{ principal: { type: "user", id: w.rina.userId }, level: "manage" }] })).toMatchObject({ ok: true });
    expect(await checkSpace(w.budi, "view", w.spaceId)).toMatchObject({ allow: false, reason: "NOT_FOUND" });
    const after = await shareInfo(w.owner, { kind: "space", id: w.spaceId });
    // Owner still opens it through the governance override and is listed as "Admin".
    expect(after.ok && after.info.people.map((p) => [p.name, p.admin])).toEqual([["Rina", false], ["Yacobus", true]]);
  });

  it("I1: a project in a Terbatas space cannot switch to Semua anggota; it can follow the space or be Terbatas", async () => {
    const w = await world();
    const p = await project(w.rina, w.spaceId);
    await saveSharing(w.rina, { kind: "space", id: w.spaceId }, { everyone: false, entries: [{ principal: { type: "user", id: w.rina.userId }, level: "manage" }] });
    const info = await shareInfo(w.rina, { kind: "project", id: p.id });
    expect(info.ok && info.info).toMatchObject({ everyone: false, followsSpace: true, spaceEveryone: false });
    const rinaOnly = [{ principal: { type: "user" as const, id: w.rina.userId }, level: "manage" as const }];
    expect(await saveSharing(w.rina, { kind: "project", id: p.id }, { everyone: true, entries: rinaOnly })).toEqual({ ok: false, code: "INVALID" });
    expect(await saveSharing(w.rina, { kind: "project", id: p.id }, { everyone: false, followSpace: false, entries: rinaOnly })).toMatchObject({ ok: true });
    expect((await ref(w.org.id, p.id)).access).toBe("restricted");
  });

  it("Terbatas project: only I and Tim Sales can see it (US-1); the last manager cannot be removed", async () => {
    const w = await world();
    const p = await project(w.rina, w.spaceId);
    const sales = await makeTeam(db, w.org.id, "Tim Sales", [w.budi.userId], w.owner.userId);
    const entries = [
      { principal: { type: "user" as const, id: w.rina.userId }, level: "manage" as const },
      { principal: { type: "team" as const, id: sales }, level: "edit" as const },
    ];
    expect(await saveSharing(w.rina, { kind: "project", id: p.id }, { everyone: false, entries })).toMatchObject({ ok: true });
    const other = await makeUser(db, "Dewi");
    await addMember(db, w.org.id, other.id);
    expect(await checkProject(ctxFor(w.org.id, other.id, "member"), "view", await ref(w.org.id, p.id))).toMatchObject({ allow: false });
    expect(await checkProject(w.budi, "edit", await ref(w.org.id, p.id))).toMatchObject({ allow: true });
    expect(await saveSharing(w.rina, { kind: "project", id: p.id }, { everyone: false, entries: [entries[1]] })).toEqual({ ok: false, code: "NO_MANAGER" });
    const events = await db.select().from(outboxEvents).where(eq(outboxEvents.type, "space.project.updated"));
    expect(events.at(-1)?.data).toEqual({ before: { access: "inherit" }, after: { access: "restricted" } });
  });

  it("is read-only below manage", async () => {
    const w = await world();
    const p = await project(w.rina, w.spaceId);
    const info = await shareInfo(w.budi, { kind: "project", id: p.id });
    expect(info.ok && info.info.canManage).toBe(false);
    expect(await saveSharing(w.budi, { kind: "project", id: p.id }, { everyone: true, entries: [] })).toEqual({ ok: false, code: "FORBIDDEN" });
  });
});

describe("US-11 — Project status", () => {
  it("manage sets status, target and note; space.project.updated carries before/after; edit is refused", async () => {
    const w = await world();
    const p = await project(w.rina, w.spaceId);
    expect(await setProjectStatus(w.budi, p.id, { status: "at_risk", targetDate: "2026-10-30", note: "", ownerUserId: w.rina.userId })).toEqual({ ok: false, code: "FORBIDDEN" });
    expect(await setProjectStatus(w.rina, p.id, { status: "at_risk", targetDate: "2026-10-30", note: "Vendor terlambat", ownerUserId: w.rina.userId })).toMatchObject({ ok: true });
    const h = await projectHeader(w.budi, await ref(w.org.id, p.id));
    expect(h).toMatchObject({ status: "at_risk", targetDate: "2026-10-30", statusNote: "Vendor terlambat", statusUpdatedBy: "Rina", owner: { name: "Rina" } });
    const events = await db.select().from(outboxEvents).where(eq(outboxEvents.type, "space.project.updated"));
    expect(events.at(-1)?.data).toMatchObject({ before: { status: null }, after: { status: "at_risk", target_date: "2026-10-30" } });
    const tree = await spaceTree(w.budi, today);
    expect(tree !== "NO_APP_ACCESS" && tree[0].projects[0].status).toBe("at_risk");
  });

  it("the owner must be able to edit the project", async () => {
    const w = await world();
    const p = await project(w.rina, w.spaceId);
    await saveSharing(w.rina, { kind: "project", id: p.id }, { everyone: false, entries: [{ principal: { type: "user", id: w.rina.userId }, level: "manage" }, { principal: { type: "user", id: w.budi.userId }, level: "view" }] });
    expect(await setProjectStatus(w.rina, p.id, { status: "on_track", targetDate: null, note: "", ownerUserId: w.budi.userId })).toEqual({ ok: false, code: "OWNER_NO_ACCESS" });
  });
});

describe("US-7 / US-15 — Sampah", () => {
  it("restores a task with its column and order", async () => {
    const w = await world();
    const p = await project(w.rina, w.spaceId);
    const ids = [await task(w.rina, p.id, "A"), await task(w.rina, p.id, "B"), await task(w.rina, p.id, "C")];
    await deleteTask(w.rina, ids[1]);
    expect((await trashList(w.rina)).map((i) => [i.kind, i.name, i.where, i.deletedBy])).toEqual([["task", "B", "Q4 Launch", "Rina"]]);
    expect(await trashList(w.budi)).toEqual([]); // Budi has edit, not manage
    expect(await restore(w.rina, "task", ids[1])).toMatchObject({ ok: true, name: "B" });
    const board = await repo.tasksOfBoard(db, w.org.id, p.boardId);
    expect(board.map((t) => t.title)).toEqual(["A", "B", "C"]);
  });

  it("returns a task to the board's first todo column when its column was deleted", async () => {
    const w = await world();
    const p = await project(w.rina, w.spaceId);
    const doing = (await cols(p.boardId)).find((c) => c.category === "in_progress")!;
    await task(w.rina, p.id, "Sudah ada");
    const id = await task(w.rina, p.id, "Draft proposal", { columnId: doing.id });
    await deleteTask(w.rina, id);
    expect(await deleteColumn(w.rina, doing.id)).toMatchObject({ ok: true });
    expect(await restore(w.rina, "task", id)).toMatchObject({ ok: true });
    const [t] = await db.select().from(tasks).where(eq(tasks.id, id));
    const todo = (await cols(p.boardId)).find((c) => c.category === "todo")!;
    expect(t.columnId).toBe(todo.id);
    expect((await repo.tasksOfBoard(db, w.org.id, p.boardId)).map((x) => x.title)).toEqual(["Sudah ada", "Draft proposal"]);
  });

  it("restores projects and empty spaces; a space whose name was taken meanwhile is refused", async () => {
    const w = await world();
    const p = await project(w.rina, w.spaceId);
    await deleteProject(w.rina, p.id);
    expect(await restore(w.rina, "project", p.id)).toMatchObject({ ok: true });
    expect(await ref(w.org.id, p.id)).toBeTruthy();
    const empty = await createSpace(w.rina, { name: "Sales", iconKey: "briefcase", description: "", access: "org" });
    if (!empty.ok) throw new Error();
    await deleteSpace(w.rina, empty.id);
    await createSpace(w.rina, { name: "sales", iconKey: "briefcase", description: "", access: "org" });
    expect(await restore(w.rina, "space", empty.id)).toEqual({ ok: false, code: "TAKEN" });
    const audit = await db.select().from(auditLog).where(eq(auditLog.action, "space.space.deleted"));
    expect(audit).toHaveLength(1);
  });

  it("PRD-13 US-1: kept for 29 days, gone after 31", async () => {
    const w = await world();
    const p = await project(w.rina, w.spaceId);
    const a = await task(w.rina, p.id, "29 hari");
    const b = await task(w.rina, p.id, "31 hari");
    await deleteTask(w.rina, a);
    await deleteTask(w.rina, b);
    await db.update(tasks).set({ deletedAt: sql`now() - interval '29 days'` }).where(eq(tasks.id, a));
    await db.update(tasks).set({ deletedAt: sql`now() - interval '31 days'` }).where(eq(tasks.id, b));
    expect(await purgeTrash()).toMatchObject({ tasks: 1 });
    expect((await db.select().from(tasks).where(eq(tasks.id, b))).length).toBe(0);
    expect(await restore(w.rina, "task", a)).toMatchObject({ ok: true });
    const other = await project(w.rina, w.spaceId, "Lama");
    await deleteProject(w.rina, other.id);
    await db.update(projects).set({ deletedAt: sql`now() - interval '31 days'` }).where(eq(projects.id, other.id));
    expect(await purgeTrash()).toMatchObject({ projects: 1 });
    const s = await createSpace(w.rina, { name: "Kosong", iconKey: "layers", description: "", access: "org" });
    if (!s.ok) throw new Error();
    await deleteSpace(w.rina, s.id);
    await db.update(spaces).set({ deletedAt: sql`now() - interval '31 days'` }).where(eq(spaces.id, s.id));
    expect(await purgeTrash()).toMatchObject({ spaces: 1 });
  });
});

describe("US-18 — Bulk actions", () => {
  it("completes the tasks I can edit in one go and reports the view-only ones as skipped", async () => {
    const w = await world();
    const a = await project(w.rina, w.spaceId, "A");
    const b = await project(w.rina, w.spaceId, "B");
    const c = await project(w.rina, w.spaceId, "C");
    await saveSharing(w.rina, { kind: "project", id: c.id }, { everyone: false, entries: [{ principal: { type: "user", id: w.rina.userId }, level: "manage" }, { principal: { type: "user", id: w.budi.userId }, level: "view" }] });
    const ids = [await task(w.rina, a.id, "1"), await task(w.rina, b.id, "2"), await task(w.rina, c.id, "3")];
    const r = await completeTasks(w.budi, ids);
    expect(r).toMatchObject({ ok: true, done: 2, skipped: 1 });
    const rows = await db.select().from(tasks);
    expect(rows.filter((t) => t.doneAt).map((t) => t.title).sort()).toEqual(["1", "2"]);
  });

  it("assigns in bulk, skipping projects the assignee cannot open", async () => {
    const w = await world();
    const a = await project(w.rina, w.spaceId, "A");
    const c = await project(w.rina, w.spaceId, "C");
    await saveSharing(w.rina, { kind: "project", id: c.id }, { everyone: false, entries: [{ principal: { type: "user", id: w.rina.userId }, level: "manage" }] });
    const ids = [await task(w.rina, a.id, "1"), await task(w.rina, c.id, "2")];
    expect(await assignTasks(w.rina, ids, { type: "user", id: w.budi.userId })).toMatchObject({ ok: true, done: 1, skipped: 1 });
    expect(await db.select().from(outboxEvents).where(eq(outboxEvents.type, "space.task.assigned"))).toHaveLength(1);
  });
});

describe("US-14 — Upload a space icon", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);

  it("stores a PNG as an organization asset and shows it on the space", async () => {
    const w = await world();
    const up = await uploadSpaceIcon(w.rina, png);
    if (!up.ok) throw new Error(up.code);
    expect(await updateSpace(w.rina, w.spaceId, { name: "Marketing", iconKey: "megaphone", iconAssetId: up.id, description: "" })).toMatchObject({ ok: true });
    const tree = await spaceTree(w.rina, today);
    expect(tree !== "NO_APP_ACCESS" && tree[0].iconAssetId).toBe(up.id);
  });

  it("rejects files over 1 MB and GIFs", async () => {
    const w = await world();
    expect(await uploadSpaceIcon(w.rina, new Uint8Array(1024 * 1024 + 1))).toEqual({ ok: false, code: "TOO_LARGE" });
    expect(await uploadSpaceIcon(w.rina, new TextEncoder().encode("GIF89a...."))).toEqual({ ok: false, code: "BAD_TYPE" });
  });

  it("removes scripts from SVGs before storing them", async () => {
    const dirty = `<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(2)</script><a xlink:href="javascript:alert(3)"><rect width="4" height="4" onclick='x()'/></a><foreignObject><div>x</div></foreignObject></svg>`;
    const clean = sanitizeSvg(dirty)!;
    expect(clean).toContain("<rect");
    expect(clean).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(clean.toLowerCase()).not.toMatch(/script|onload|onclick|javascript:|foreignobject/);
  });
});

describe("PRD-02 US-1b — Titik mulai", () => {
  it("Tim kreatif & marketing seeds Marketing with three projects; Mulai di sini holds 3 unassigned tasks", async () => {
    const owner = await makeUser(db, "Yacobus");
    const r = await createOrganization(owner.id, { name: "Maju Jaya", slug: "maju-jaya", timezone: "Asia/Jakarta", defaultLocale: "id" }, undefined, (tx, ctx) => seedPreset(tx, ctx, "marketing", "id"));
    if (!r.ok) throw new Error(r.code);
    const tree = await spaceTree(ctxFor(r.org.id, owner.id, "owner"), today);
    if (tree === "NO_APP_ACCESS") throw new Error();
    expect(tree.map((s) => [s.name, s.everyone, s.projects.map((p) => p.name)])).toEqual([["Marketing", true, ["Kalender Konten", "Mulai di sini", "Studio Desain"]]]);
    const start = tree[0].projects.find((p) => p.name === "Mulai di sini")!;
    const rows = await db.select().from(tasks).where(eq(tasks.projectId, start.id));
    expect(rows.map((t) => [t.title, t.assigneeId])).toEqual([["Undang tim Anda", null], ["Buat proyek pertama", null], ["Coba geser kartu ini ke Selesai", null]]);
  });
});

describe("Ringkasan and Members tab (v2.2)", () => {
  it("counts only this project's top-level tasks; the Members tab and the header count the same people", async () => {
    const w = await world();
    const p = await project(w.rina, w.spaceId);
    const cs = await cols(p.boardId);
    const done = cs.find((c) => c.category === "done")!;
    await task(w.rina, p.id, "Terlambat", { assignee: { type: "user", id: w.budi.userId }, dueDate: "2026-09-20" });
    await task(w.rina, p.id, "Minggu ini", { assignee: { type: "user", id: w.budi.userId }, dueDate: "2026-10-03" });
    await task(w.rina, p.id, "Tanpa orang");
    const fin = await task(w.rina, p.id, "Selesai tepat", { assignee: { type: "user", id: w.budi.userId }, dueDate: "2099-01-01" });
    const [row] = await db.select().from(tasks).where(eq(tasks.id, fin));
    await moveTask(w.rina, fin, row.version, { columnId: done.id, index: 0 });
    const other = await project(w.rina, w.spaceId, "Lain");
    await task(w.rina, other.id, "Bukan proyek ini", { assignee: { type: "user", id: w.budi.userId } });
    expect(await projectKpis(w.rina, p.id, today)).toEqual({ open: 3, overdue: 1, dueSoon: 1, unassigned: 1, done: 1, total: 4 });
    const m = await projectMembers(w.rina, await ref(w.org.id, p.id), today, "Asia/Jakarta");
    const budi = m.rows.find((x) => x.name === "Budi")!;
    expect(budi).toMatchObject({ open: 2, overdue: 1, done30: 1, onTime: 100, lead: false });
    expect(m.rows.find((x) => x.name === "Rina")).toMatchObject({ lead: true, onTime: null });
    const h = await projectHeader(w.rina, await ref(w.org.id, p.id));
    expect(h.people.length).toBe(m.rows.length);
  });
});
