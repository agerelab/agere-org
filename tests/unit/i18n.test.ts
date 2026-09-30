import { describe, expect, it } from "vitest";
import { resolveLocale, translator } from "@/i18n";
import { formatDateLong, formatDateShort, formatMoney, formatNumber, formatTime } from "@/i18n/format";

// 28 Sep 2026, 09:00 in Asia/Jakarta.
const d = new Date(Date.UTC(2026, 8, 28, 2, 0));
const nbsp = (s: string) => s.replace(/ /g, " ");

describe("resolveLocale (TECH-01 F16)", () => {
  it("prefers the user, then the organization, then English", () => {
    expect(resolveLocale("id", "en")).toBe("id");
    expect(resolveLocale(null, "id")).toBe("id");
    expect(resolveLocale(undefined, undefined)).toBe("en");
    expect(resolveLocale("fr", "de")).toBe("en");
  });
});

describe("translator", () => {
  it("fills positional placeholders", () => {
    expect(translator("en")("date.overdueSince", "25 Sep")).toBe("Overdue since 25 Sep");
    expect(translator("id")("date.overdueSince", "25 Sep")).toBe("Terlambat sejak 25 Sep");
  });
});

describe("formats (UI-01 Bahasa & format)", () => {
  it("dates put the day first in both languages", () => {
    expect(formatDateShort("en", d)).toBe("28 Sep");
    expect(formatDateShort("id", d)).toBe("28 Sep");
    expect(formatDateLong("en", d)).toBe("Mon, 28 Sep 2026");
    expect(formatDateLong("id", d)).toBe("Sen, 28 Sep 2026");
  });

  it("times use a 24-hour clock", () => {
    expect(formatTime("en", d)).toBe("09:00");
    expect(formatTime("id", d)).toBe("09.00");
  });

  it("numbers and IDR follow the language", () => {
    expect(formatNumber("en", 1234.5)).toBe("1,234.5");
    expect(formatNumber("id", 1234.5)).toBe("1.234,5");
    expect(nbsp(formatMoney("en", 49000))).toBe("IDR 49,000");
    expect(formatMoney("id", 49000)).toBe("Rp49.000");
  });
});
