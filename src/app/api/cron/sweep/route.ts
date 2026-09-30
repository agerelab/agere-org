import { sweep } from "@/modules/events";

export const dynamic = "force-dynamic";

/** Vercel Cron, every minute (PRD-00b D4). Protected by CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const result = await sweep();
  return Response.json(result, { headers: { "cache-control": "no-store" } });
}
