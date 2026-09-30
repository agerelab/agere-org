import "server-only";
// Request-side helpers: the session cookie (PRD-01 §6.2), request metadata and the current user.
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession, SESSION_ABSOLUTE_MS, type RequestMeta } from "./service";

export const SESSION_COOKIE = "agere_session";

export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_ABSOLUTE_MS / 1000,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function sessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

/** Public base URL for email links: APP_URL, else the request's own origin. */
export async function appUrl(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function requestMeta(): Promise<RequestMeta> {
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip"),
    userAgent: h.get("user-agent"),
    requestId: h.get("x-vercel-id") ?? undefined,
    appUrl: await appUrl(),
  };
}

/** The signed-in user for this request, loaded once per render (every request checks the row, US-6). */
export const currentSession = cache(async () => getSession(await sessionToken()));

/** Pages behind sign-in: no session → /masuk; unverified email → /cek-email (US-2). */
export async function requireVerifiedUser() {
  const s = await currentSession();
  if (!s) redirect("/masuk?expired=1");
  if (!s.user.emailVerifiedAt) redirect("/cek-email");
  return s;
}
