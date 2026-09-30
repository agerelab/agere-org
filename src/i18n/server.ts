import "server-only";
import { cookies } from "next/headers";
import { COOKIE } from "@/ui/shell/cookies";
import { resolveLocale, translator, type Locale } from "./index";

/** Signed out, and until user preferences exist (PRD-12): the switcher's cookie, else English (TECH-01 F16). */
export async function getLocale(): Promise<Locale> {
  return resolveLocale((await cookies()).get(COOKIE.lang)?.value);
}

export async function getTranslator() {
  return translator(await getLocale());
}

/** Light by default (PRD-12 §5.3); set before first paint so there is no flash. */
export async function getTheme(): Promise<"light" | "dark"> {
  return (await cookies()).get(COOKIE.theme)?.value === "dark" ? "dark" : "light";
}

/** Whether the viewer hid the contextual panel (Ctrl+B); kept across pages and reloads. */
export async function getPanelHidden(): Promise<boolean> {
  return (await cookies()).get(COOKIE.panel)?.value === "hidden";
}
