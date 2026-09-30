import { sweep } from "@/modules/events";
import { purgeTrash } from "@/modules/space/trash";

export const dynamic = "force-dynamic";

/** Vercel Cron, every minute (PRD-00b D4). Protected by CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const result = await sweep();
  // Sampah is purged once an hour (PRD-13: items older than 30 days no longer exist).
  const purged = new Date().getUTCMinutes() === 0 ? await purgeTrash() : null;
  return Response.json({ ...result, purged }, { headers: { "cache-control": "no-store" } });
}
