// PRD-06 Space & Project — acceptance criteria (§9) and rules (§6).
import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { auditLog, boardColumns, outboxEvents, tasks } from "@/db/schema";
import type { Db } from "@/db/client";
import { saveAcl } from "@/modules/authz/service";
import { createSpace, deleteSpace, updateSpace } from "@/modules/space/spaces";
import { createColumn, createProject, deleteColumn, deleteProject, setArchived } from "@/modules/space/projects";
import { addComment, createTask, deleteTask, moveTask, updateTask } from "@/modules/space/tasks";
import { myTasks, projectBoard, spaceTree, taskDetail } from "@/modules/space/queries";
import { removeMember } from "@/modules/people/members";
import { deleteTeam } from "@/modules/people/teams";
import { checkProject } from "@/modules/space/access";
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

describe("US-1 — Create and share a project", () => {
  it("has a default board with 3 columns, the creator manages it and every member can open it", async () => {
    const w = await world();
    const p = await project(w.rina, w.spaceId);
    expect((await cols(p.boardId)).map((c) => [c.name, c.category]).sort()).toEqual([["Belum dikerjakan", "todo"], ["Sedang dikerjakan", "in_progress"], ["Selesai", "done"]].sort());
    const ref = (await repo.project(db, w.org.id, p.id))!;
    expect(await checkProject(w.rina, "manage", ref)).toMatchObject({ allow: true, level: "manage" });
    expect(await checkProject(w.budi, "edit", ref)).toMatchObject({ allow: true, level: "edit" });
  });

  it("a Terbatas project is visible only to its principals (PRD-04 US-1)", async () => {
    const w = await world();
    const p = await project(w.rina, w.spaceId);
    const sales = await makeTeam(db, w.org.id, "Tim Sales", [w.budi.userId], w.owner.userId);
    await db.transaction(async (tx) => {
      await repo.updateProject(tx, w.org.id, p.id, { access: "restricted" });
      await saveAcl(tx, w.rina, { type: "space.project", id: p.id }, [{ principal: { type: "user", id: w.rina.userId }, level: "manage" }]);
    });
    const ref = (await repo.project(db, w.org.id, p.id))!;
    expect(await checkProject(w.budi, "view", ref)).toMatchObject({ allow: false, reason: "NOT_FOUND" });
    await db.transaction((tx) => saveAcl(tx, w.rina, { type: "space.project", id: p.id }, [{ principal: { type: "user", id: w.rina.userId }, level: "manage" }, { principal: { type: "team", id: sales }, level: "edit" }]));
    expect(await checkProject(w.budi, "edit", ref)).toMatchObject({ allow: true });
    const tree = await spaceTree(w.budi, today);
    expect(tree !== "NO_APP_ACCESS" && tree[0].projects.map((x) => x.name)).toEqual(["Q4 Launch"]);
  });
});

describe("US-3 — Move with persistence", () => {
  it("keeps the column and position after reload, and sets done_at in a done column", async () => {
    const w = await world();
    const p = await project(w.rina, w.spaceId);
    const c = await cols(p.boardId);
    const todo = c.find((x) => x.category === "todo")!;
    const doing = c.find((x) => x.category === "in_progress")!;
    const done = c.find((x) => x.category === "done")!;
    const a = await createTask(w.rina, p.id, { title: "Riset harga" });
    const b = await createTask(w.rina, p.id, { title: "Draft proposal", columnId: doing.id });
    const x = await createTask(w.rina, p.id, { title: "Kickoff", columnId: doing.id });
    if (!a.ok || !b.ok || !x.ok) throw new Error();
    expect(await moveTask(w.rina, a.id, 1, { columnId: doing.id, index: 1 })).toMatchObject({ ok: true, version: 2 });
    const board = await projectBoard(w.rina, p.id, undefined, "manage");
    expect(board.tasks.filter((t) => t.columnId === doing.id).map((t) => t.title)).toEqual(["Draft proposal", "Riset harga", "Kickoff"]);
    expect(await moveTask(w.rina, a.id, 1, { columnId: done.id, index: 0 })).toEqual({ ok: false, code: "VERSION_CONFLICT" });
    await moveTask(w.rina, a.id, 2, { columnId: done.id, index: 0 });
    const [row] = await db.select().from(tasks).where(eq(tasks.id, a.id));
    expect(row.doneAt).toBeInstanceOf(Date);
    await moveTask(w.rina, a.id, 3, { columnId: todo.id, index: 0 });
    expect((await db.select().from(tasks).where(eq(tasks.id, a.id)))[0].doneAt).toBeNull();
  });

  it("rejects stale edits with VERSION_CONFLICT (§6.2)", async () => {
    const w = await world();
    const p = await project(w.rina, w.spaceId);
    const t = await createTask(w.rina, p.id, { title: "Banner" });
    if (!t.ok) throw new Error();
    expect(await updateTask(w.rina, t.id, 1, { title: "Banner promo" })).toMatchObject({ ok: true, version: 2 });
    expect(await updateTask(w.budi, t.id, 1, { title: "Other" })).toEqual({ ok: false, code: "VERSION_CONFLICT" });
    expect(await updateTask(w.budi, t.id, 2, { dueDate: "2026-02-31" })).toEqual({ ok: false, code: "INVALID" });
  });
});

describe("US-2 / US-12 — Assign with access", () => {
  it("publishes space.task.assigned for others but not for yourself", async () => {
    const w = await world();
    const p = await project(w.rina, w.spaceId);
    const t = await createTask(w.rina, p.id, { title: "Riset", assignee: { type: "user", id: w.budi.userId } });
    await createTask(w.rina, p.id, { title: "Mine", assignee: { type: "user", id: w.rina.userId } });
    expect(t.ok).toBe(true);
    const assigned = (await db.select().from(outboxEvents)).filter((e) => e.type === "space.task.assigned");
    expect(assigned).toHaveLength(1);
    expect(assigned[0].data).toMatchObject({ assignee_id: w.budi.userId });
  });

  it("refuses assignees who cannot view the project, and teams without an explicitly granted member", async () => {
    const w = await world();
    const p = await project(w.rina, w.spaceId);
    const ops = await makeTeam(db, w.org.id, "Tim Ops", [w.budi.userId], w.owner.userId);
    await db.transaction(async (tx) => {
      await repo.updateProject(tx, w.org.id, p.id, { access: "restricted" });
      await saveAcl(tx, w.rina, { type: "space.project", id: p.id }, [{ principal: { type: "user", id: w.rina.userId }, level: "manage" }]);
    });
    expect(await createTask(w.rina, p.id, { title: "Gaji", assignee: { type: "user", id: w.budi.userId } })).toEqual({ ok: false, code: "ASSIGNEE_NO_ACCESS" });
    expect(await createTask(w.rina, p.id, { title: "Gaji", assignee: { type: "team", id: ops } })).toEqual({ ok: false, code: "ASSIGNEE_NO_ACCESS" });
    // The Owner can view through the governance override, so may be assigned.
    expect((await createTask(w.rina, p.id, { title: "Gaji", assignee: { type: "user", id: w.owner.userId } })).ok).toBe(true);
  });
});

describe("US-5 — Tugas saya", () => {
  it("lists my and my teams' open tasks in projects I can view, not a team task in a project I cannot", async () => {
    const w = await world();
    const ops = await makeTeam(db, w.org.id, "Tim Ops", [w.budi.userId, w.rina.userId], w.owner.userId);
    const a = await project(w.rina, w.spaceId, "Studio Desain");
    const hidden = await project(w.rina, w.spaceId, "Gaji 2027");
    await createTask(w.rina, a.id, { title: "Banner", assignee: { type: "user", id: w.budi.userId }, dueDate: "2026-09-25" });
    await createTask(w.rina, a.id, { title: "Poster", assignee: { type: "team", id: ops } });
    await createTask(w.rina, hidden.id, { title: "Slip gaji", assignee: { type: "team", id: ops } });
    await db.transaction(async (tx) => {
      await repo.updateProject(tx, w.org.id, hidden.id, { access: "restricted" });
      await saveAcl(tx, w.rina, { type: "space.project", id: hidden.id }, [{ principal: { type: "user", id: w.rina.userId }, level: "manage" }]);
    });
    expect((await myTasks(w.budi)).map((t) => t.title).sort()).toEqual(["Banner", "Poster"]);
  });
});

describe("US-6 — Cross-organization isolation", () => {
  it("answers 404 for another organization's project and task", async () => {
    const w = await world();
    const p = await project(w.rina, w.spaceId);
    const t = await createTask(w.rina, p.id, { title: "Riset" });
    const outsider = await makeUser(db, "Outsider");
    const other = await makeOrg(outsider.id, "kopi-kita", "Kopi Kita");
    const x = ctxFor(other.id, outsider.id, "owner");
    expect(await updateTask(x, t.ok ? t.id : "", 1, { title: "hack" })).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(await taskDetail(x, t.ok ? t.id : "")).toBeNull();
    expect(await createTask(x, p.id, { title: "x" })).toEqual({ ok: false, code: "NOT_FOUND" });
  });
});

describe("US-7 — Trash", () => {
  it("needs manage to delete a task; the task leaves the board", async () => {
    const w = await world();
    const p = await project(w.rina, w.spaceId);
    const t = await createTask(w.rina, p.id, { title: "Riset" });
    if (!t.ok) throw new Error();
    expect(await deleteTask(w.budi, t.id)).toEqual({ ok: false, code: "FORBIDDEN" });
    expect(await deleteTask(w.rina, t.id)).toMatchObject({ ok: true });
    expect((await projectBoard(w.rina, p.id, undefined, "manage")).tasks).toHaveLength(0);
    expect((await db.select().from(tasks))[0].deletedAt).toBeInstanceOf(Date);
  });

  it("archives read-only and deletes projects to Sampah with an audit row", async () => {
    const w = await world();
    const p = await project(w.rina, w.spaceId);
    await setArchived(w.rina, p.id, true);
    expect(await createTask(w.rina, p.id, { title: "x" })).toEqual({ ok: false, code: "FORBIDDEN" });
    expect(await deleteProject(w.budi, p.id)).toEqual({ ok: false, code: "FORBIDDEN" });
    expect(await deleteProject(w.rina, p.id)).toMatchObject({ ok: true });
    expect((await db.select().from(auditLog)).map((a) => a.action)).toContain("space.project.deleted");
  });
});

describe("US-8 — Removed assignee (PRD-03)", () => {
  it("reassigns 12 open tasks to the target in the removal's transaction", async () => {
    const w = await world();
    const p = await project(w.rina, w.spaceId);
    for (let i = 0; i < 12; i++) await createTask(w.rina, p.id, { title: `T${i}`, assignee: { type: "user", id: w.budi.userId } });
    expect(await removeMember(w.owner, w.budi.userId, { space: w.rina.userId })).toMatchObject({ ok: true });
    const rows = await db.select().from(tasks);
    expect(rows.every((t) => t.assigneeId === w.rina.userId)).toBe(true);
    const bulk = (await db.select().from(outboxEvents)).filter((e) => e.type === "space.task.assigned" && e.bulkOperationId);
    expect(bulk).toHaveLength(12);
    expect(new Set(bulk.map((e) => e.bulkOperationId)).size).toBe(1);
  });

  it("unassigns a deleted team's open tasks (PRD-03 §6.4)", async () => {
    const w = await world();
    const p = await project(w.rina, w.spaceId);
    const ops = await makeTeam(db, w.org.id, "Tim Ops", [w.budi.userId], w.owner.userId);
    await createTask(w.rina, p.id, { title: "Ops", assignee: { type: "team", id: ops } });
    await deleteTeam(w.owner, ops);
    expect((await db.select().from(tasks))[0].assigneeId).toBeNull();
  });
});

describe("US-13 / US-15 / US-16 — Spaces", () => {
  it("keeps space names unique case-insensitively and guards deletion of non-empty spaces", async () => {
    const w = await world();
    expect(await createSpace(w.rina, { name: "marketing", iconKey: "layers", description: "", access: "org" })).toEqual({ ok: false, code: "TAKEN" });
    const sales = await createSpace(w.rina, { name: "Sales", iconKey: "briefcase", description: "", access: "org" });
    if (!sales.ok) throw new Error();
    expect(await updateSpace(w.rina, sales.id, { name: "Marketing", iconKey: "layers", description: "" })).toEqual({ ok: false, code: "TAKEN" });
    expect(await updateSpace(w.budi, sales.id, { name: "Sales & BD", iconKey: "layers", description: "" })).toEqual({ ok: false, code: "FORBIDDEN" });
    await project(w.rina, sales.id);
    await project(w.rina, sales.id, "Pipeline");
    expect(await deleteSpace(w.rina, sales.id)).toEqual({ ok: false, code: "NOT_EMPTY", projects: 2 });
  });

  it("a project in a Terbatas space is not visible outside the space's principals", async () => {
    const w = await world();
    const fin = await createSpace(w.rina, { name: "Accounting & Finance", iconKey: "wallet", description: "", access: "restricted" });
    if (!fin.ok) throw new Error();
    const p = await project(w.rina, fin.id, "Tagihan Vendor");
    const ref = (await repo.project(db, w.org.id, p.id))!;
    expect(await checkProject(w.budi, "view", ref)).toMatchObject({ allow: false, reason: "NOT_FOUND" });
    expect(await createProject(w.budi, fin.id, { name: "x" }, "id")).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(await checkProject(w.owner, "manage", ref)).toMatchObject({ allow: true, override: true });
  });
});

describe("Columns and comments", () => {
  it("blocks deleting a column that holds tasks, and records comments", async () => {
    const w = await world();
    const p = await project(w.rina, w.spaceId);
    const c = await createColumn(w.rina, p.boardId, "Review", "in_progress");
    if (!c.ok) throw new Error();
    const t = await createTask(w.rina, p.id, { title: "Riset", columnId: c.id });
    expect(await deleteColumn(w.rina, c.id)).toEqual({ ok: false, code: "NOT_EMPTY" });
    await addComment(w.budi, t.ok ? t.id : "", "Siap dicek");
    const d = await taskDetail(w.rina, t.ok ? t.id : "");
    expect(d?.comments).toMatchObject([{ body: "Siap dicek", author: "Budi" }]);
  });
});
