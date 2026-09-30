"use server";
// Server Actions for the sign-in screens (PRD-01 §8). Inputs are parsed with Zod; messages are i18n keys.
import { redirect } from "next/navigation";
import { z } from "zod";
import type { MessageKey } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { dispatchAfterResponse } from "@/modules/events";
import * as identity from "@/modules/identity/service";
import { maskEmail } from "@/modules/identity/crypto";
import { safeRedirect } from "@/modules/identity/redirect";
import { clearSessionCookie, currentSession, requestMeta, sessionToken, setSessionCookie } from "@/modules/identity/web";

export type FormState = { error?: MessageKey; fields?: Partial<Record<string, MessageKey>>; values?: Record<string, string>; done?: boolean };

const email = z.string().trim().min(1, "auth.error.required").max(254, "auth.error.email").pipe(z.email("auth.error.email"));
const password = z.string().min(8, "auth.error.passwordShort").max(128, "auth.error.passwordLong");

function fieldErrors(error: z.ZodError): FormState["fields"] {
  const out: Record<string, MessageKey> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0]);
    out[key] ??= issue.message as MessageKey;
  }
  return out;
}

const str = (f: FormData, k: string) => String(f.get(k) ?? "");

export async function signInAction(_: FormState, form: FormData): Promise<FormState> {
  const values = { email: str(form, "email") };
  const parsed = z.object({ email, password: z.string().min(1, "auth.error.required") }).safeParse({ email: values.email, password: str(form, "password") });
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };
  const r = await identity.signIn(parsed.data.email, parsed.data.password, await requestMeta());
  dispatchAfterResponse(r.eventIds);
  if (!r.ok) return { error: r.code === "LOCKED" ? "auth.error.locked" : "auth.error.invalid", values };
  await setSessionCookie(r.sessionToken);
  redirect(r.user.emailVerifiedAt ? safeRedirect(str(form, "redirect_to")) : "/cek-email");
}

export async function signUpAction(_: FormState, form: FormData): Promise<FormState> {
  const values = { name: str(form, "name"), email: str(form, "email") };
  const parsed = z
    .object({
      name: z.string().trim().min(1, "auth.error.required").max(80),
      email,
      password,
      consent: z.literal("on", { error: "auth.error.consent" }),
    })
    .safeParse({ ...values, password: str(form, "password"), consent: form.get("consent") ?? undefined });
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };
  const { sessionToken: token } = await identity.signUp(
    { name: parsed.data.name, email: parsed.data.email, password: parsed.data.password, locale: await getLocale() },
    await requestMeta(),
  );
  if (token) await setSessionCookie(token);
  redirect(`/cek-email?to=${encodeURIComponent(maskEmail(parsed.data.email.toLowerCase()))}`);
}

export async function resendVerificationAction(): Promise<FormState> {
  const s = await currentSession();
  if (s) await identity.resendVerification(s.user, await requestMeta());
  return { done: true };
}

export async function forgotPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const values = { email: str(form, "email") };
  const parsed = z.object({ email }).safeParse(values);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };
  await identity.requestReset(parsed.data.email, await requestMeta());
  return { done: true, values };
}

export async function resetPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ password }).safeParse({ password: str(form, "password") });
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };
  const r = await identity.resetPassword(str(form, "token"), parsed.data.password, await requestMeta());
  if (!r.ok) return { error: "auth.linkInvalid" };
  dispatchAfterResponse(r.eventIds);
  await setSessionCookie(r.sessionToken);
  redirect("/");
}

export async function signOutAction() {
  await identity.signOut(await sessionToken());
  await clearSessionCookie();
  redirect("/masuk");
}

/** Re-authentication dialog (PRD-01 §6.3): true when the password matches. */
export async function reauthAction(password: string): Promise<boolean> {
  const s = await currentSession();
  if (!s) return false;
  return identity.reauthenticate(s.sessionId, s.user.id, password);
}
