// PRD-01 Identity — acceptance criteria (§9) as tests. Locked lane (PLAN-01 §5): review these first.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { outboxEvents, sessions, users, verificationTokens } from "@/db/schema";
import type { Db } from "@/db/client";
import * as identity from "@/modules/identity/service";
import { setEmailSender, type OutgoingEmail } from "@/modules/identity/email";
import { safeRedirect } from "@/modules/identity/redirect";
import { tokenHash } from "@/modules/identity/crypto";
import { freshDb } from "../helpers/db";

const meta = { ip: "203.0.113.7", userAgent: "vitest", appUrl: "https://org.agere.test" };
const RINA = { name: "Rina Kusuma", email: "Rina@Maju.co.id", password: "correct horse battery", locale: null };
let db: Db;
let outbox: OutgoingEmail[];

const linkToken = (m: OutgoingEmail) => new URL(m.text.match(/https:\/\/\S+/)![0]).searchParams.get("token")!;
const eventTypes = async () => (await db.select().from(outboxEvents)).map((e) => e.type);

async function signUpVerified(input = RINA) {
  await identity.signUp(input, meta);
  const verify = outbox.find((m) => m.subject.includes("Verify"))!;
  await identity.verifyEmail(linkToken(verify));
  outbox = [];
}

beforeEach(async () => {
  ({ db } = await freshDb());
  outbox = [];
  setEmailSender(async (m) => void outbox.push(m));
});
afterEach(() => setEmailSender(undefined));

describe("US-1 — Sign in and return", () => {
  it("creates a session with valid credentials (email is case-insensitive)", async () => {
    await signUpVerified();
    const r = await identity.signIn("rina@maju.co.id", RINA.password, meta);
    expect(r.ok).toBe(true);
    const s = await identity.getSession(r.ok ? r.sessionToken : null);
    expect(s?.user.email).toBe("rina@maju.co.id");
  });

  it("keeps relative redirect_to and sends anything else to /", () => {
    expect(safeRedirect("/maju-jaya/s/marketing")).toBe("/maju-jaya/s/marketing");
    expect(safeRedirect("https://evil.example")).toBe("/");
    expect(safeRedirect("//evil.example/x")).toBe("/");
    expect(safeRedirect("https://org.agere.test/x", ["https://org.agere.test"])).toBe("https://org.agere.test/x");
  });
});

describe("US-2 — Verify email", () => {
  it("signs up unverified with consent recorded, then verifies once within 24 hours", async () => {
    const { sessionToken } = await identity.signUp(RINA, meta);
    const s = await identity.getSession(sessionToken);
    expect(s?.user.emailVerifiedAt).toBeNull();
    expect(outbox).toHaveLength(1);
    const token = linkToken(outbox[0]);
    expect(await identity.verifyEmail(token)).toMatchObject({ ok: true });
    expect((await identity.getSession(sessionToken))?.user.emailVerifiedAt).toBeInstanceOf(Date);
    expect(await identity.verifyEmail(token)).toEqual({ ok: false });
  });

  it("refuses an expired link", async () => {
    await identity.signUp(RINA, meta);
    await db.update(verificationTokens).set({ expiresAt: new Date(Date.now() - 1000) });
    expect(await identity.verifyEmail(linkToken(outbox[0]))).toEqual({ ok: false });
  });

  it("does not reveal an existing account at sign-up", async () => {
    await signUpVerified();
    const again = await identity.signUp({ ...RINA, password: "another password 1" }, meta);
    expect(again.sessionToken).toBeNull();
    expect(outbox.map((m) => m.subject)).toEqual(["You already have an agere/org account"]);
    expect(await db.select().from(users)).toHaveLength(1);
  });
});

describe("US-3 — Reset password", () => {
  it("responds the same whether or not the email exists", async () => {
    await signUpVerified();
    await expect(identity.requestReset("nobody@maju.co.id", meta)).resolves.toBeUndefined();
    await expect(identity.requestReset("rina@maju.co.id", meta)).resolves.toBeUndefined();
    expect(outbox.map((m) => m.to)).toEqual(["rina@maju.co.id"]);
  });

  it("changes the password with a live link, revokes other sessions and publishes both events", async () => {
    await signUpVerified();
    const a = await identity.signIn(RINA.email, RINA.password, meta);
    const b = await identity.signIn(RINA.email, RINA.password, meta);
    await identity.requestReset(RINA.email, meta);
    const token = linkToken(outbox[0]);
    const r = await identity.resetPassword(token, "a brand new password", meta);
    expect(r.ok).toBe(true);
    expect(await identity.getSession(a.ok ? a.sessionToken : "")).toBeNull();
    expect(await identity.getSession(b.ok ? b.sessionToken : "")).toBeNull();
    expect(await identity.getSession(r.ok ? r.sessionToken : "")).not.toBeNull();
    expect(await eventTypes()).toEqual(["security.password.changed", "security.session.revoked"]);
    expect((await identity.signIn(RINA.email, "a brand new password", meta)).ok).toBe(true);
    expect(await identity.resetPassword(token, "yet another password", meta)).toEqual({ ok: false });
  });

  it("refuses a link older than 60 minutes", async () => {
    await signUpVerified();
    await identity.requestReset(RINA.email, meta);
    await db.update(verificationTokens).set({ expiresAt: new Date(Date.now() - 1000) });
    expect(await identity.resetPassword(linkToken(outbox[0]), "a brand new password", meta)).toEqual({ ok: false });
  });

  it("sends at most 3 emails per address per hour", async () => {
    await signUpVerified();
    for (let i = 0; i < 5; i++) await identity.requestReset(RINA.email, meta);
    expect(outbox).toHaveLength(3);
  });
});

describe("US-4 — Brute-force protection", () => {
  it("locks the account after 5 failures within 15 minutes, even for the right password", async () => {
    await signUpVerified();
    for (let i = 0; i < 5; i++) expect(await identity.signIn(RINA.email, "wrong password", meta)).toMatchObject({ ok: false, code: "INVALID" });
    expect(await eventTypes()).toEqual(["security.login.failed_threshold"]);
    expect(await identity.signIn(RINA.email, RINA.password, meta)).toMatchObject({ ok: false, code: "LOCKED" });
  });

  it("gives the same answer for an unknown email", async () => {
    expect(await identity.signIn("nobody@maju.co.id", "whatever password", meta)).toMatchObject({ ok: false, code: "INVALID" });
  });
});

describe("US-6 — Session revocation is immediate", () => {
  it("signs out every device on the next request", async () => {
    await signUpVerified();
    const a = await identity.signIn(RINA.email, RINA.password, meta);
    const b = await identity.signIn(RINA.email, RINA.password, meta);
    const user = (await identity.getSession(a.ok ? a.sessionToken : ""))!.user;
    await identity.signOutAll(user.id, meta);
    expect(await identity.getSession(a.ok ? a.sessionToken : "")).toBeNull();
    expect(await identity.getSession(b.ok ? b.sessionToken : "")).toBeNull();
    expect(await eventTypes()).toEqual(["security.session.revoked"]);
  });

  it("expires sessions after 7 idle days or 30 days in total (§6.2)", async () => {
    await signUpVerified();
    const a = await identity.signIn(RINA.email, RINA.password, meta);
    const token = a.ok ? a.sessionToken : "";
    await db.update(sessions).set({ expiresAt: new Date(Date.now() - 1) });
    expect(await identity.getSession(token)).toBeNull();
    const b = await identity.signIn(RINA.email, RINA.password, meta);
    await db.update(sessions).set({ createdAt: new Date(Date.now() - identity.SESSION_ABSOLUTE_MS - 1) });
    expect(await identity.getSession(b.ok ? b.sessionToken : "")).toBeNull();
    // Expired rows are deleted when they are next presented.
    expect(await db.select().from(sessions).where(eq(sessions.id, tokenHash(token)))).toHaveLength(0);
    expect(await db.select().from(sessions).where(eq(sessions.id, tokenHash(b.ok ? b.sessionToken : "")))).toHaveLength(0);
  });
});
