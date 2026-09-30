import { currentSession } from "@/modules/identity/web";
import { exportMyData } from "@/modules/account/deletion";

export const dynamic = "force-dynamic";

/** "Unduh data saya" (PRD-12 Should, PRD-13): the signed-in user's data as JSON. */
export async function GET() {
  const s = await currentSession();
  if (!s) return new Response("Unauthorized", { status: 401 });
  const data = await exportMyData(s.user.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="agere-org-data-saya-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
}
