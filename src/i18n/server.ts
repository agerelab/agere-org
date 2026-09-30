import "server-only";
import { cookies } from "next/headers";
import { currentSession } from "@/modules/identity/web";
import { COOKIE } from "@/ui/shell/cookies";
import { resolveLocale, translator, type Locale } from "./index";

/**
 * The reader's language (PRD-12 v1.2.3, D45): the signed-in user's preference, else the switcher's
 * cookie (signed out, or never chosen), else English.
 */
export async function getLocale(): Promise<Locale> {
  const s = await currentSession();
  if (s?.user.locale) return s.user.locale;
  return resolveLocale((await cookies()).get(COOKIE.lang)?.value);
}

export async function getTranslator() {
  return translator(await getLocale());
}

export type ThemePreference = "light" | "dark" | "system";

/**
 * Theme (PRD-12 §5.3): the user's preference when signed in, else the header toggle's cookie; light by
 * default, and light before sign-in unless toggled. "system" is resolved in the browser before paint.
 */
export async function getThemePreference(): Promise<ThemePreference> {
  const s = await currentSession();
  if (s) return s.user.theme;
  return (await cookies()).get(COOKIE.theme)?.value === "dark" ? "dark" : "light";
}

/** The theme to render on the server; "system" renders light until the pre-paint script decides. */
export async function getTheme(): Promise<"light" | "dark"> {
  return (await getThemePreference()) === "dark" ? "dark" : "light";
}

/** Whether the viewer hid the contextual panel (Ctrl+B); kept across pages and reloads. */
export async function getPanelHidden(): Promise<boolean> {
  return (await cookies()).get(COOKIE.panel)?.value === "hidden";
}
