// PRD-12 Settings & Profile (personal) and PRD-13 §6.3 account deletion — acceptance criteria.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { credentials, outboxEvents, sessions, users } from "@/db/schema";
import type { Db } from "@/db/client";
import { setEmailSender, type OutgoingEmail } from "@/modules/identity/email";
import * as identity from "@/modules/identity/service";
import { avatarSrc, effectiveTimezone, readAvatar, setAvatar, setPreferences, updateProfile } from "@/modules/account/profile";
import { changePassword, devices, revokeDevice, securityActivity } from "@/modules/account/security";
import { deleteAccount, deletionBlockers, exportMyData, scrubDeletedAccounts } from "@/modules/account/deletion";
import { handleNotification } from "@/modules/notifications";
import { getEvent } from "@/modules/events/repository";
import { leave } from "@/modules/people/members";
import { dueTodayDigest } from "@/modules/notifications";
import { createSpace } from "@/modules/space/spaces";
import { createProject } from "@/modules/space/projects";
import { createTask } from "@/modules/space/tasks";
import { freshDb } from "../helpers/db";
import { addMember, ctxFor, makeOrg, makeUser } from "../helpers/fixtures";

let db: Db;
let mail: OutgoingEmail[] = [];
const meta = { appUrl: "http://localhost:3000", userAgent: "Vitest" };
beforeEach(async () => {
  ({ db } = await freshDb());
  mail = [];
  setEmailSender(async (m) => void mail.push(m));
});
afterEach(() => setEmailSender(undefined));

/** A real account with a password, signed in once. */
async function account(name = "Rina Kusuma", email = "rina@maju.co.id") {
  await identity.signUp({ name, email, password: "rahasia-lama-1", locale: "id" }, meta);
  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.email, email));
  const [u] = await db.select().from(users).where(eq(users.email, email));
  const signIn = await identity.signIn(email, "rahasia-lama-1", meta);
  if (!("sessionToken" in signIn) || !signIn.sessionToken) throw new Error(JSON.stringify(signIn));
  const s = (await identity.getSession(signIn.sessionToken))!;
  mail = [];
  return { user: u, session: s, token: signIn.sessionToken };
}

describe("Profil (§4)", () => {
  it("saves name and Jabatan within limits", async () => {
    const { user } = await account();
    expect(await updateProfile(user.id, { name: "R", title: "" })).toMatchObject({ ok: false, field: "name" });
    expect(await updateProfile(user.id, { name: "Rina K.", title: "x".repeat(61) })).toMatchObject({ ok: false, field: "title" });
    expect(await updateProfile(user.id, { name: "  Rina K.  ", title: "Desainer Senior" })).toEqual({ ok: true });
    const [u] = await db.select().from(users).where(eq(users.id, user.id));
    expect([u.name, u.title]).toEqual(["Rina K.", "Desainer Senior"]);
  });

  it("stores a PNG avatar for people who share an organization, refuses other files and outsiders", async () => {
    const { user } = await account();
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
    expect(await setAvatar(user.id, new TextEncoder().encode("GIF89a...."))).toEqual({ ok: false, code: "BAD_TYPE" });
    expect(await setAvatar(user.id, new Uint8Array(2 * 1024 * 1024 + 1))).toEqual({ ok: false, code: "TOO_LARGE" });
    expect(await setAvatar(user.id, png)).toEqual({ ok: true });
    const [u] = await db.select().from(users).where(eq(users.id, user.id));
    expect(avatarSrc(user.id, u.avatarUpdatedAt)).toMatch(new RegExp(`^/api/avatars/${user.id}\\?v=\\d+$`));
    const colleague = await makeUser(db, "Budi");
    const stranger = await makeUser(db, "Asing");
    const org = await makeOrg(user.id);
    await addMember(db, org.id, colleague.id);
    expect(await readAvatar(colleague.id, user.id)).toMatchObject({ contentType: "image/png" });
    expect(await readAvatar(stranger.id, user.id)).toBeNull();
  });
});

describe("Preferensi — US-2 timezone, language, theme", () => {
  it("follows the organization until a personal timezone is chosen", async () => {
    const { user } = await account();
    const org = { timezone: "Asia/Makassar" };
    expect(effectiveTimezone(user, org)).toBe("Asia/Makassar");
    expect(await setPreferences(user.id, { timezone: "Mars/Olympus" })).toEqual({ ok: false, code: "INVALID" });
    await setPreferences(user.id, { timezone: "Asia/Jakarta", theme: "system", locale: "en" });
    const [u] = await db.select().from(users).where(eq(users.id, user.id));
    expect([effectiveTimezone(u, org), u.theme, u.locale]).toEqual(["Asia/Jakarta", "system", "en"]);
    await setPreferences(user.id, { timezone: null });
    const [back] = await db.select().from(users).where(eq(users.id, user.id));
    expect(effectiveTimezone(back, org)).toBe("Asia/Makassar");
  });

  it("the 08.00 digest follows the person's own timezone", async () => {
    const { user } = await account();
    const org = await makeOrg(user.id); // Asia/Jakarta
    const ctx = ctxFor(org.id, user.id, "owner");
    const s = await createSpace(ctx, { name: "Umum", iconKey: "layers", description: "", access: "org" });
    if (!s.ok) throw new Error();
    const p = await createProject(ctx, s.id, { name: "P" }, "id");
    if (!p.ok) throw new Error();
    await createTask(ctx, p.id, { title: "Banner", assignee: { type: "user", id: user.id }, dueDate: "2026-10-01" });
    await setPreferences(user.id, { timezone: "Asia/Jayapura" }); // WIT, UTC+9
    expect(await dueTodayDigest(new Date("2026-10-01T01:00:00Z"))).toBe(0); // 08.00 WIB, 10.00 WIT
    expect(await dueTodayDigest(new Date("2026-09-30T23:00:00Z"))).toBe(1); // 08.00 WIT
  });

  it("an email after a language change arrives in the new language", async () => {
    const { user } = await account();
    await setPreferences(user.id, { locale: "en" });
    const r = await changePassword(user.id, (await db.select().from(sessions).where(eq(sessions.userId, user.id)))[0].id, "rahasia-lama-1", "rahasia-baru-22", meta);
    if (!r.ok) throw new Error(r.code);
    await handleNotification((await getEvent(db, r.eventIds[0]))!);
    expect(mail.map((m) => m.subject)).toEqual(["Your agere/org password was changed"]);
  });
});

describe("Keamanan (§4)", () => {
  it("changes the password with the current one, keeps this device and signs out the others", async () => {
    const a = await account();
    const other = await identity.signIn("rina@maju.co.id", "rahasia-lama-1", { ...meta, userAgent: "Ponsel" });
    if (!("sessionToken" in other) || !other.sessionToken) throw new Error();
    expect((await devices(a.user.id, a.session.sessionId)).length).toBe(3); // sign-up, sign-in, sign-in on the phone
    expect(await changePassword(a.user.id, a.session.sessionId, "salah", "rahasia-baru-22", meta)).toEqual({ ok: false, code: "WRONG_PASSWORD" });
    expect(await changePassword(a.user.id, a.session.sessionId, "rahasia-lama-1", "pendek", meta)).toEqual({ ok: false, code: "WEAK" });
    expect(await changePassword(a.user.id, a.session.sessionId, "rahasia-lama-1", "rahasia-baru-22", meta)).toMatchObject({ ok: true });
    expect((await devices(a.user.id, a.session.sessionId)).map((d) => d.current)).toEqual([true]);
    expect(await identity.getSession(other.sessionToken)).toBeNull();
    expect(await identity.signIn("rina@maju.co.id", "rahasia-baru-22", meta)).toHaveProperty("sessionToken");
    const activity = await securityActivity(a.user.id);
    expect(activity.map((e) => e.type)).toEqual(expect.arrayContaining(["security.password.changed", "security.session.revoked"]));
  });

  it("signs out one other device but never the current one", async () => {
    const a = await account();
    const list = await devices(a.user.id, a.session.sessionId);
    const other = list.find((d) => !d.current)!;
    expect(await revokeDevice(a.user.id, a.session.sessionId, a.session.sessionId, meta)).toMatchObject({ ok: false });
    expect(await revokeDevice(a.user.id, other.id, a.session.sessionId, meta)).toMatchObject({ ok: true });
    expect((await devices(a.user.id, a.session.sessionId)).length).toBe(list.length - 1);
  });
});

describe("US-4 / PRD-13 §6.3 — Account deletion", () => {
  it("is blocked while a member; a sole Owner must transfer ownership first", async () => {
    const a = await account();
    const org = await makeOrg(a.user.id);
    const other = await makeOrg(a.user.id, "sinar-retail", "Sinar Retail");
    const budi = await makeUser(db, "Budi");
    await addMember(db, other.id, budi.id, "owner");
    const blockers = await deletionBlockers(a.user.id);
    expect(blockers.map((b) => [b.name, b.soleOwner])).toEqual([["Maju Jaya", true], ["Sinar Retail", false]]);
    expect(await deleteAccount(a.user.id, new Date(), meta)).toEqual({ ok: false, code: "HAS_ORGANIZATIONS" });
    expect(await leave(ctxFor(org.id, a.user.id, "owner"))).toEqual({ ok: false, code: "LAST_OWNER" });
    expect(await leave(ctxFor(other.id, a.user.id, "owner"))).toMatchObject({ ok: true });
    expect((await deletionBlockers(a.user.id)).map((b) => b.name)).toEqual(["Maju Jaya"]);
  });

  it("needs recent authentication, stops sign-in at once, confirms by email, then scrubs to a tombstone", async () => {
    const a = await account();
    expect(await deleteAccount(a.user.id, new Date(Date.now() - 11 * 60_000), meta)).toEqual({ ok: false, code: "REAUTH_REQUIRED" });
    const r = await deleteAccount(a.user.id, new Date(), meta);
    if (!r.ok) throw new Error(r.code);
    expect(await identity.getSession(a.token)).toBeNull();
    expect(await identity.signIn("rina@maju.co.id", "rahasia-lama-1", meta)).not.toHaveProperty("sessionToken", expect.any(String));
    expect(await db.select().from(credentials).where(eq(credentials.userId, a.user.id))).toHaveLength(0);
    await handleNotification((await getEvent(db, r.eventIds[0]))!);
    expect(mail.map((m) => [m.to, m.subject])).toEqual([["rina@maju.co.id", "Permintaan hapus akun Anda diterima"]]);
    expect(await scrubDeletedAccounts()).toBe(0); // waits an hour so the email goes first
    await db.update(users).set({ deletedAt: sql`now() - interval '2 hours'` }).where(eq(users.id, a.user.id));
    expect(await scrubDeletedAccounts()).toBe(1);
    const [u] = await db.select().from(users).where(eq(users.id, a.user.id));
    expect([u.name, u.email.endsWith("@deleted.invalid"), u.status]).toEqual(["Pengguna terhapus", true, "deleted"]);
    // The address is free again.
    await identity.signUp({ name: "Rina Baru", email: "rina@maju.co.id", password: "rahasia-lama-1", locale: "id" }, meta);
    expect((await db.select().from(users).where(eq(users.email, "rina@maju.co.id"))).length).toBe(1);
    const events = await db.select().from(outboxEvents).where(eq(outboxEvents.type, "identity.account.deletion_requested"));
    expect(events).toHaveLength(1);
    expect(await db.select().from(outboxEvents).where(eq(outboxEvents.type, "identity.account.deleted"))).toHaveLength(1);
  });

  it("exports my data as JSON", async () => {
    const a = await account();
    const org = await makeOrg(a.user.id);
    const ctx = ctxFor(org.id, a.user.id, "owner");
    const s = await createSpace(ctx, { name: "Umum", iconKey: "layers", description: "", access: "org" });
    if (!s.ok) throw new Error();
    const p = await createProject(ctx, s.id, { name: "P" }, "id");
    if (!p.ok) throw new Error();
    await createTask(ctx, p.id, { title: "Tugas saya" });
    const data = await exportMyData(a.user.id);
    expect(data).toMatchObject({ format: "agere-org/my-data@1", profile: { email: "rina@maju.co.id" }, organizations: [{ slug: "maju-jaya", role: "owner" }], tasks: [{ title: "Tugas saya" }] });
  });
});
