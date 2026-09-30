// Dates, times, numbers and money per language (UI-01 "Bahasa & format", D45). Day before month in
// both languages so dates are never ambiguous. Exports and APIs use ISO 8601, not these helpers.
import type { Locale } from "./index";

/** Timezone rule (PRD-12 §5.2): user → organization default → Asia/Jakarta. */
export const DEFAULT_TIME_ZONE = "Asia/Jakarta";

// en-US spells short months "Sep" (en-GB says "Sept"); order is fixed below, not by the locale.
const INTL_LOCALE: Record<Locale, string> = { en: "en-US", id: "id-ID" };

function parts(locale: Locale, date: Date, timeZone: string) {
  const f = new Intl.DateTimeFormat(INTL_LOCALE[locale], { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  return { weekday: p.weekday, day: p.day, month: p.month, year: p.year };
}

/** "28 Sep" in both languages. */
export function formatDateShort(locale: Locale, date: Date, timeZone = DEFAULT_TIME_ZONE): string {
  const p = parts(locale, date, timeZone);
  return `${p.day} ${p.month}`;
}

/** "30 Oct 2026" / "30 Okt 2026" (project targets, Sampah). */
export function formatDateMedium(locale: Locale, date: Date, timeZone = DEFAULT_TIME_ZONE): string {
  const p = parts(locale, date, timeZone);
  return `${p.day} ${p.month} ${p.year}`;
}

/** A YYYY-MM-DD calendar date (no time zone) as "30 Okt 2026". */
export const formatIsoDate = (locale: Locale, iso: string) => formatDateMedium(locale, new Date(`${iso}T00:00:00Z`), "UTC");

/** "Mon, 28 Sep 2026" / "Sen, 28 Sep 2026". */
export function formatDateLong(locale: Locale, date: Date, timeZone = DEFAULT_TIME_ZONE): string {
  const p = parts(locale, date, timeZone);
  return `${p.weekday}, ${p.day} ${p.month} ${p.year}`;
}

/** 24-hour clock: "09:00" / "09.00". */
export function formatTime(locale: Locale, date: Date, timeZone = DEFAULT_TIME_ZONE): string {
  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone }).format(date);
}

/** "1,234.5" / "1.234,5". */
export function formatNumber(locale: Locale, value: number): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale]).format(value);
}

/** IDR by default: "IDR 49,000" / "Rp49.000" (no decimals for rupiah). */
export function formatMoney(locale: Locale, value: number, currency = "IDR"): string {
  const digits = currency === "IDR" ? 0 : undefined;
  if (locale === "id") {
    const s = new Intl.NumberFormat("id-ID", { style: "currency", currency, maximumFractionDigits: digits }).format(value);
    return s.replace(/Rp\s/, "Rp");
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "code", maximumFractionDigits: digits }).format(value);
}
