// Spaces (PRD-06 §6.9, US-13, US-15).
import { getDb } from "@/db/client";
import { uuidv7 } from "@/lib/ids";
import type { RequestContext } from "@/lib/context";
import { publish } from "@/modules/events";
import { appAccess, saveAcl } from "@/modules/authz/service";
import { checkSpace } from "./access";
import * as repo from "./repository";
import { orgCtx, type Fail } from "./shared";

export const SPACE_ICONS = ["layers", "megaphone", "palette", "code", "briefcase", "rocket", "users", "wallet", "heart", "sparkles"] as const;
export type SpaceIcon = (typeof SPACE_ICONS)[number];
export type SpaceInput = { name: string; iconKey: string; description: string; access: "org" | "restricted" };

function validate(input: SpaceInput): Fail<"INVALID"> | null {
  const name = input.name.trim();
  if (name.length < 1 || name.length > 60 || input.description.length > 500 || !SPACE_ICONS.includes(input.iconKey as SpaceIcon)) return { ok: false, code: "INVALID" };
  return null;
}

/** "Space baru": the creator manages it; "Semua anggota" gives every member edit (PRD-04 §6.3). */
export async function createSpace(ctx: RequestContext, input: SpaceInput): Promise<{ ok: true; id: string; eventIds: string[] } | Fail<"INVALID" | "TAKEN" | "NO_APP_ACCESS">> {
  const bad = validate(input);
  if (bad) return bad;
  const db = getDb();
  if ((await appAccess(db, ctx, "space")) !== "ok") return { ok: false, code: "NO_APP_ACCESS" };
  if (await repo.spaceByName(db, ctx.organizationId, input.name.trim())) return { ok: false, code: "TAKEN" };
  const id = uuidv7();
  const eventIds = await db.transaction(async (tx) => {
    await repo.insertSpace(tx, { organizationId: ctx.organizationId, id, name: input.name.trim(), iconKey: input.iconKey, description: input.description.trim(), createdBy: ctx.userId });
    const acl = await saveAcl(tx, ctx, { type: "space.space", id }, [
      { principal: { type: "user", id: ctx.userId }, level: "manage" },
      ...(input.access === "org" ? [{ principal: { type: "org" as const, id: ctx.organizationId }, level: "edit" as const }] : []),
    ]);
    const ids = [await publish(tx, orgCtx(ctx), { type: "space.space.created", subject: { module: "space", type: "space", id }, data: { name: input.name.trim() } })];
    if (acl.ok) ids.push(acl.eventId);
    return ids;
  });
  return { ok: true, id, eventIds };
}

/** "Edit space" (manage): name, icon, description. Access changes go through Bagikan. */
export async function updateSpace(ctx: RequestContext, id: string, input: Omit<SpaceInput, "access">): Promise<{ ok: true; eventIds: string[] } | Fail<"INVALID" | "TAKEN" | "NOT_FOUND" | "FORBIDDEN">> {
  const bad = validate({ ...input, access: "org" });
  if (bad) return bad;
  const db = getDb();
  const space = await repo.space(db, ctx.organizationId, id);
  if (!space) return { ok: false, code: "NOT_FOUND" };
  const d = await checkSpace(ctx, "manage", id);
  if (!d.allow) return { ok: false, code: d.reason === "FORBIDDEN" ? "FORBIDDEN" : "NOT_FOUND" };
  const clash = await repo.spaceByName(db, ctx.organizationId, input.name.trim());
  if (clash && clash.id !== id) return { ok: false, code: "TAKEN" };
  const eventId = await db.transaction(async (tx) => {
    await repo.updateSpace(tx, ctx.organizationId, id, { name: input.name.trim(), iconKey: input.iconKey, description: input.description.trim() });
    return publish(tx, orgCtx(ctx), {
      type: "space.space.updated",
      subject: { module: "space", type: "space", id },
      before: { name: space.name, icon_key: space.iconKey },
      after: { name: input.name.trim(), icon_key: input.iconKey },
    });
  });
  return { ok: true, eventIds: [eventId] };
}

/** US-15: only an empty space can be deleted; it goes to Sampah (soft delete). */
export async function deleteSpace(ctx: RequestContext, id: string): Promise<{ ok: true; eventIds: string[] } | Fail<"NOT_FOUND" | "FORBIDDEN"> | { ok: false; code: "NOT_EMPTY"; projects: number }> {
  const db = getDb();
  if (!(await repo.space(db, ctx.organizationId, id))) return { ok: false, code: "NOT_FOUND" };
  const d = await checkSpace(ctx, "manage", id);
  if (!d.allow) return { ok: false, code: d.reason === "FORBIDDEN" ? "FORBIDDEN" : "NOT_FOUND" };
  const n = await repo.projectCount(db, ctx.organizationId, id);
  if (n) return { ok: false, code: "NOT_EMPTY", projects: n };
  const eventId = await db.transaction(async (tx) => {
    await repo.updateSpace(tx, ctx.organizationId, id, { deletedAt: new Date() });
    return publish(tx, orgCtx(ctx), { type: "space.space.deleted", subject: { module: "space", type: "space", id } });
  });
  return { ok: true, eventIds: [eventId] };
}
