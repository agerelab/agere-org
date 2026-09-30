// Titik mulai (PRD-02 v1.2 §8.1, D30): onboarding step 2 seeds the first space and its projects in
// the organization's language, inside the same transaction that creates the organization. Presets seed
// names and default columns only, never people or permissions; "Mulai di sini" is always included.
import { generateKeyBetween } from "fractional-indexing";
import type { Tx } from "@/db/client";
import { uuidv7 } from "@/lib/ids";
import type { RequestContext } from "@/lib/context";
import { translator, type Locale, type MessageKey } from "@/i18n";
import { PRESET_CONTENT, type Preset } from "./preset-content";
import { publish } from "@/modules/events";
import { saveAcl } from "@/modules/authz/service";
import { upsertAclRow } from "@/modules/authz/repository";
import { insertBoardWithColumns } from "./projects";
import * as repo from "./repository";
import { orgCtx } from "./shared";

export { PRESETS, PRESET_CONTENT, type Preset } from "./preset-content";

const STARTER_TASKS: MessageKey[] = ["preset.task1", "preset.task2", "preset.task3"];

/** Seeds one space ("Semua anggota") with the preset's projects; the starter project gets 3 unassigned example tasks. */
export async function seedPreset(tx: Tx, ctx: RequestContext, preset: Preset, locale: Locale): Promise<string[]> {
  const t = translator(locale);
  const content = PRESET_CONTENT[preset];
  const spaceId = uuidv7();
  await repo.insertSpace(tx, { organizationId: ctx.organizationId, id: spaceId, name: t(content.space), iconKey: content.icon, description: "", createdBy: ctx.userId });
  const acl = await saveAcl(tx, ctx, { type: "space.space", id: spaceId }, [
    { principal: { type: "user", id: ctx.userId }, level: "manage" },
    { principal: { type: "org", id: ctx.organizationId }, level: "edit" },
  ]);
  const ids = [await publish(tx, orgCtx(ctx), { type: "space.space.created", subject: { module: "space", type: "space", id: spaceId }, data: { name: t(content.space) } })];
  if (acl.ok) ids.push(acl.eventId);
  for (const key of content.projects) {
    const id = uuidv7();
    const starter = key === "preset.start";
    await repo.insertProject(tx, { organizationId: ctx.organizationId, id, spaceId, name: t(key), description: starter ? t("preset.startDescription") : "", createdBy: ctx.userId, ownerUserId: ctx.userId });
    await upsertAclRow(tx, ctx.organizationId, { type: "space.project", id }, { type: "user", id: ctx.userId }, "manage");
    const boardId = await insertBoardWithColumns(tx, ctx.organizationId, id, t("space.board.default"), generateKeyBetween(null, null), locale);
    ids.push(await publish(tx, orgCtx(ctx), { type: "space.project.created", subject: { module: "space", type: "project", id, container: { type: "space", id: spaceId } }, data: { name: t(key) } }));
    if (!starter) continue;
    const todo = (await repo.columnsOf(tx, ctx.organizationId, boardId)).find((c) => c.category === "todo")!;
    let last: string | null = null;
    for (const title of STARTER_TASKS) {
      last = generateKeyBetween(last, null);
      await repo.insertTask(tx, { organizationId: ctx.organizationId, id: uuidv7(), projectId: id, boardId, columnId: todo.id, title: t(title), orderKey: last, createdBy: ctx.userId });
    }
  }
  return ids;
}
