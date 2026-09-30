import { pingDb } from "@/db/client";

export const dynamic = "force-dynamic";

/** GET /api/health — deployment check. 200 when the database answers, 503 otherwise. Booleans only. */
export async function GET() {
  let database = false;
  try {
    await pingDb();
    database = true;
  } catch {
    database = false;
  }
  return Response.json(
    { ok: database, checks: { database, cronSecret: !!process.env.CRON_SECRET } },
    { status: database ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
