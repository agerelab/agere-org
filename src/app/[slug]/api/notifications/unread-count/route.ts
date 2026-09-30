import { requireOrg } from "@/modules/org/web";
import { unreadCount } from "@/modules/notifications";

export const dynamic = "force-dynamic";

/** The Desk badge (PRD-10 §6): polled every 60 s while the tab is visible and on focus. */
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { ctx } = await requireOrg((await params).slug);
  return Response.json({ count: await unreadCount(ctx) }, { headers: { "cache-control": "no-store" } });
}
