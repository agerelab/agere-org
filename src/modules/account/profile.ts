// Personal settings (PRD-12 v1.3): profile, avatar and preferences. Everything here changes only the
// signed-in user, in every organization (§2); nothing takes an organization.
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { memberships, userAvatars, users } from "@/db/schema";
import { isLocale, type Locale } from "@/i18n";
import { isTimezone } from "@/modules/org/service";

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
export type Theme = "light" | "dark" | "system";

export type ProfileError = "INVALID";

/** Profil: name 2–80, Jabatan 0–60 (D49). */
export async function updateProfile(userId: string, input: { name: string; title: string }): Promise<{ ok: true } | { ok: false; code: ProfileError; field: "name" | "title" }> {
  const name = input.name.trim();
  const title = input.title.trim();
  if (name.length < 2 || name.length > 80) return { ok: false, code: "INVALID", field: "name" };
  if (title.length > 60) return { ok: false, code: "INVALID", field: "title" };
  await getDb().update(users).set({ name, title: title || null, updatedAt: new Date() }).where(eq(users.id, userId));
  return { ok: true };
}

/** The real type from the first bytes (PNG, JPG or WebP only; §4). */
export function sniffImage(b: Uint8Array): "image/png" | "image/jpeg" | "image/webp" | null {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 12 && String.fromCharCode(...b.subarray(0, 4)) === "RIFF" && String.fromCharCode(...b.subarray(8, 12)) === "WEBP") return "image/webp";
  return null;
}

/** Avatar (§4, §6): PNG/JPG/WebP ≤ 2 MB; the browser crops it to 256 px before upload. */
export async function setAvatar(userId: string, bytes: Uint8Array): Promise<{ ok: true } | { ok: false; code: "TOO_LARGE" | "BAD_TYPE" }> {
  if (bytes.length > MAX_AVATAR_BYTES) return { ok: false, code: "TOO_LARGE" };
  const type = sniffImage(bytes);
  if (!type) return { ok: false, code: "BAD_TYPE" };
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx
      .insert(userAvatars)
      .values({ userId, contentType: type, bytes, size: bytes.length })
      .onConflictDoUpdate({ target: userAvatars.userId, set: { contentType: type, bytes, size: bytes.length, updatedAt: new Date() } });
    await tx.update(users).set({ avatarUpdatedAt: new Date() }).where(eq(users.id, userId));
  });
  return { ok: true };
}

export async function removeAvatar(userId: string) {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.delete(userAvatars).where(eq(userAvatars.userId, userId));
    await tx.update(users).set({ avatarUpdatedAt: null }).where(eq(users.id, userId));
  });
}

/** Avatars are shown to the person and to members of an organization they share (404 otherwise). */
export async function readAvatar(viewerId: string, userId: string) {
  const db = getDb();
  if (viewerId !== userId) {
    const rows = await db
      .select({ org: memberships.organizationId, user: memberships.userId })
      .from(memberships)
      .where(and(inArray(memberships.userId, [viewerId, userId]), eq(memberships.status, "active")));
    const mine = new Set(rows.filter((r) => r.user === viewerId).map((r) => r.org));
    if (!rows.some((r) => r.user === userId && mine.has(r.org))) return null;
  }
  const [row] = await db.select().from(userAvatars).where(eq(userAvatars.userId, userId));
  return row ?? null;
}

/** "/api/avatars/{id}?v=…" when the person has an avatar; the version busts the browser cache. */
export const avatarSrc = (userId: string, updatedAt: Date | string | null | undefined) =>
  updatedAt ? `/api/avatars/${userId}?v=${new Date(updatedAt).getTime()}` : undefined;

/** Preferensi (§4): theme, timezone ("Ikuti organisasi" = null) and language. */
export async function setPreferences(userId: string, input: { theme?: Theme; timezone?: string | null; locale?: Locale }): Promise<{ ok: true } | { ok: false; code: "INVALID" }> {
  const set: Partial<typeof users.$inferInsert> = {};
  if (input.theme !== undefined) {
    if (!["light", "dark", "system"].includes(input.theme)) return { ok: false, code: "INVALID" };
    set.theme = input.theme;
  }
  if (input.timezone !== undefined) {
    if (input.timezone !== null && !isTimezone(input.timezone)) return { ok: false, code: "INVALID" };
    set.timezone = input.timezone;
  }
  if (input.locale !== undefined) {
    if (!isLocale(input.locale)) return { ok: false, code: "INVALID" };
    set.locale = input.locale;
  }
  if (!Object.keys(set).length) return { ok: true };
  await getDb().update(users).set({ ...set, updatedAt: new Date() }).where(eq(users.id, userId));
  return { ok: true };
}

/** §5.2: the user's timezone, else the organization's, else Asia/Jakarta. */
export const effectiveTimezone = (user: { timezone: string | null }, org?: { timezone: string } | null) => user.timezone ?? org?.timezone ?? "Asia/Jakarta";
