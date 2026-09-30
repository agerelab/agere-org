import { currentSession } from "@/modules/identity/web";
import { readAvatar } from "@/modules/account/profile";

const UUID = /^[0-9a-f-]{36}$/;
const notFound = () => new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });

/** Avatars (PRD-12 §4): the person and members of an organization they share; 404 otherwise. */
export async function GET(_: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!UUID.test(userId)) return notFound();
  const s = await currentSession();
  if (!s) return notFound();
  const a = await readAvatar(s.user.id, userId);
  if (!a) return notFound();
  return new Response(Buffer.from(a.bytes), {
    headers: {
      "content-type": a.contentType,
      "content-length": String(a.size),
      // The URL carries ?v=<updated time>, so a new photo is a new URL.
      "cache-control": "private, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; sandbox",
    },
  });
}
