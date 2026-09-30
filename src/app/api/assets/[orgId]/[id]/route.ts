import { getDb } from "@/db/client";
import { currentSession } from "@/modules/identity/web";
import { membershipOf } from "@/modules/org/repository";
import { readAsset } from "@/modules/space/assets";

const UUID = /^[0-9a-f-]{36}$/;
const notFound = () => new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });

/**
 * Organization assets (uploaded space icons, PRD-06 US-14): members of the organization only, 404
 * otherwise (PRD-04 E6). Served with a CSP that blocks scripts and embedding, never sniffed.
 */
export async function GET(_: Request, { params }: { params: Promise<{ orgId: string; id: string }> }) {
  const { orgId, id } = await params;
  if (!UUID.test(orgId) || !UUID.test(id)) return notFound();
  const session = await currentSession();
  if (!session) return notFound();
  const m = await membershipOf(getDb(), orgId, session.user.id);
  if (!m || m.status !== "active") return notFound();
  const asset = await readAsset(orgId, id);
  if (!asset) return notFound();
  return new Response(Buffer.from(asset.bytes), {
    headers: {
      "content-type": asset.contentType,
      "content-length": String(asset.size),
      // Ids are never reused, so a browser may keep the file; only this user's browser (private).
      "cache-control": "private, max-age=31536000, immutable",
      "content-security-policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
      "x-content-type-options": "nosniff",
      "content-disposition": "inline",
    },
  });
}
