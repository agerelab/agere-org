// i18n gate (PLAN-01 §6, D45): every key in both catalogs, same placeholders, no empty strings.
import { describe, expect, it } from "vitest";
import en from "@/i18n/en.json";
import id from "@/i18n/id.json";

const placeholders = (s: string) => [...s.matchAll(/\{\d+\}/g)].map((m) => m[0]).sort();

describe("i18n catalogs", () => {
  it("en and id have the same keys", () => {
    expect(Object.keys(id).sort()).toEqual(Object.keys(en).sort());
  });

  it("every message uses the same placeholders in both languages", () => {
    for (const [key, value] of Object.entries(en)) {
      expect(placeholders((id as Record<string, string>)[key] ?? ""), key).toEqual(placeholders(value));
    }
  });

  it("no message is empty", () => {
    for (const [key, value] of [...Object.entries(en), ...Object.entries(id)]) expect(value.trim(), key).not.toBe("");
  });
});
