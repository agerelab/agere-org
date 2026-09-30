import { sweep } from "@/modules/events";
import "@/modules/registry";
import { hourlyNotificationJobs } from "@/modules/notifications";
import { purgeTrash } from "@/modules/space/trash";

export const dynamic = "force-dynamic";

/** Vercel Cron, every minute (PRD-00b D4). Protected by CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const result = await sweep();
  // Once an hour: Sampah purge (PRD-13, 30 days), notification retention (90 days) and the
  // 08.00 due-today digest (PRD-10 §6).
  const hourly = new Date().getUTCMinutes() === 0 ? { trash: await purgeTrash(), notifications: await hourlyNotificationJobs() } : null;
  return Response.json({ ...result, hourly }, { headers: { "cache-control": "no-store" } });
}
