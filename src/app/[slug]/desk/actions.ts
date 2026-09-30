"use server";
// Kotak masuk actions (PRD-10 §7). The inbox module scopes every call to the signed-in recipient.
import { revalidatePath } from "next/cache";
import { requireOrg } from "@/modules/org/web";
import * as notifications from "@/modules/notifications";

export async function markReadAction(slug: string, id: string) {
  const { ctx } = await requireOrg(slug);
  await notifications.markRead(ctx, id);
  revalidatePath(`/${slug}/desk/kotak-masuk`);
}

export async function markAllReadAction(slug: string) {
  const { ctx } = await requireOrg(slug);
  const n = await notifications.markAllRead(ctx);
  revalidatePath(`/${slug}/desk/kotak-masuk`);
  return n;
}

export async function archiveAction(slug: string, id: string) {
  const { ctx } = await requireOrg(slug);
  const ok = await notifications.archive(ctx, id);
  revalidatePath(`/${slug}/desk/kotak-masuk`);
  return ok;
}
