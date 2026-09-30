// Message catalogs (D45, UI-01 "Bahasa & format"). en.json is the source, id.json the translation;
// every key lives in both (tests/lint/i18n.test.ts). User content is never translated.
import en from "./en.json";
import id from "./id.json";

export type Locale = "en" | "id";
export type MessageKey = keyof typeof en;

export const LOCALES: readonly Locale[] = ["en", "id"];
export const DEFAULT_LOCALE: Locale = "en";

const CATALOGS: Record<Locale, Record<MessageKey, string>> = { en, id };

export const isLocale = (v: unknown): v is Locale => v === "en" || v === "id";

/** Locale order (TECH-01 F16): user preference → organization default → English. */
export function resolveLocale(user?: string | null, organization?: string | null): Locale {
  if (isLocale(user)) return user;
  if (isLocale(organization)) return organization;
  return DEFAULT_LOCALE;
}

/** t(key, ...args) with positional placeholders {0}, {1}, … */
export function translator(locale: Locale) {
  return (key: MessageKey, ...args: (string | number)[]) =>
    (CATALOGS[locale][key] ?? en[key] ?? key).replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}
