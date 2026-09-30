"use server";
// Pengaturan actions (PRD-12). Each acts on the signed-in user only; nothing takes an organization
// except "Keluar" from one, which goes through the people module's own rules (PRD-03).
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { MessageKey } from "@/i18n";
import { isLocale, type Locale } from "@/i18n";
import { dispatchAfterResponse } from "@/modules/events";
import { clearSessionCookie, currentSession, requestMeta, requireVerifiedUser } from "@/modules/identity/web";
import * as identity from "@/modules/identity/service";
import * as profile from "@/modules/account/profile";
import * as security from "@/modules/account/security";
import * as deletion from "@/modules/account/deletion";
import { leave } from "@/modules/people/members";
import { membershipOf } from "@/modules/org/repository";
import { getDb } from "@/db/client";
import type { Role } from "@/lib/context";
import { COOKIE } from "@/ui/shell/cookies";

export type SettingsResult = { ok: true; message?: MessageKey } | { ok: false; error: MessageKey; field?: string };

const ONE_YEAR = 60 * 60 * 24 * 365;
const done = (message: MessageKey = "settings.saved"): SettingsResult => {
  revalidatePath("/", "layout");
  return { ok: true, message };
};

export async function updateProfileAction(input: { name: string; title: string }): Promise<SettingsResult> {
  const { user } = await requireVerifiedUser();
  const r = await profile.updateProfile(user.id, input);
  if (!r.ok) return { ok: false, error: r.field === "name" ? "settings.nameInvalid" : "settings.titleInvalid", field: r.field };
  return done();
}

export async function uploadAvatarAction(form: FormData): Promise<SettingsResult> {
  const { user } = await requireVerifiedUser();
  const file = form.get("file");
  if (!(file instanceof File)) return { ok: false, error: "settings.avatarInvalid" };
  if (file.size > profile.MAX_AVATAR_BYTES) return { ok: false, error: "settings.avatarInvalid" };
  const r = await profile.setAvatar(user.id, new Uint8Array(await file.arrayBuffer()));
  if (!r.ok) return { ok: false, error: "settings.avatarInvalid" };
  return done();
}

export async function removeAvatarAction(): Promise<SettingsResult> {
  const { user } = await requireVerifiedUser();
  await profile.removeAvatar(user.id);
  return done();
}

/** Theme from Preferensi or the header toggle (PRD-12 §5.3): saved for the user and mirrored in a cookie. */
export async function setThemeAction(theme: profile.Theme): Promise<SettingsResult> {
  const s = await currentSession();
  const jar = await cookies();
  if (theme === "light" || theme === "dark") jar.set(COOKIE.theme, theme, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
  if (s) {
    const r = await profile.setPreferences(s.user.id, { theme });
    if (!r.ok) return { ok: false, error: "settings.saveFailed" };
  }
  return done();
}

export async function setTimezoneAction(timezone: string | null): Promise<SettingsResult> {
  const { user } = await requireVerifiedUser();
  const r = await profile.setPreferences(user.id, { timezone });
  if (!r.ok) return { ok: false, error: "settings.saveFailed" };
  return done();
}

/** Language (D45): applies at once to the whole app, and to notifications and emails from now on. */
export async function setLanguageAction(locale: Locale): Promise<SettingsResult> {
  if (!isLocale(locale)) return { ok: false, error: "settings.saveFailed" };
  (await cookies()).set(COOKIE.lang, locale, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
  const s = await currentSession();
  if (s) await profile.setPreferences(s.user.id, { locale });
  return done();
}

export async function changePasswordAction(current: string, next: string): Promise<SettingsResult> {
  const s = await requireVerifiedUser();
  const r = await security.changePassword(s.user.id, s.sessionId, current, next, await requestMeta());
  if (!r.ok) return { ok: false, error: r.code === "WRONG_PASSWORD" ? "settings.wrongPassword" : "auth.error.passwordShort", field: r.code === "WRONG_PASSWORD" ? "current" : "next" };
  dispatchAfterResponse(r.eventIds);
  return done("settings.passwordChanged");
}

export async function revokeDeviceAction(sessionId: string): Promise<SettingsResult> {
  const s = await requireVerifiedUser();
  const r = await security.revokeDevice(s.user.id, sessionId, s.sessionId, await requestMeta());
  if (!r.ok) return { ok: false, error: "settings.saveFailed" };
  dispatchAfterResponse(r.eventIds);
  return done("settings.deviceSignedOut");
}

/** "Keluar dari semua perangkat": this device too, then back to sign-in. */
export async function signOutEverywhereAction() {
  const s = await requireVerifiedUser();
  dispatchAfterResponse(await identity.signOutAll(s.user.id, await requestMeta()));
  await clearSessionCookie();
  redirect("/masuk");
}

/** "Keluar" from one organization on the deletion page (PRD-03 self-leave; the last Owner cannot). */
export async function leaveOrganizationAction(organizationId: string): Promise<SettingsResult> {
  const { user } = await requireVerifiedUser();
  const m = await membershipOf(getDb(), organizationId, user.id);
  if (!m) return { ok: false, error: "people.error.notFound" };
  const r = await leave({ requestId: crypto.randomUUID(), organizationId, userId: user.id, role: m.role as Role });
  if (!r.ok) return { ok: false, error: "settings.soleOwner" };
  dispatchAfterResponse(r.eventIds);
  return done("settings.left");
}

export async function deleteAccountAction(): Promise<SettingsResult> {
  const s = await requireVerifiedUser();
  const r = await deletion.deleteAccount(s.user.id, s.lastAuthAt, await requestMeta());
  if (!r.ok) return { ok: false, error: r.code === "REAUTH_REQUIRED" ? "settings.reauth" : "settings.hasOrganizations" };
  dispatchAfterResponse(r.eventIds);
  await clearSessionCookie();
  redirect("/masuk?deleted=1");
}
