// Notification sentences (PRD-10 §5): every kind has a sentence and a label in both languages, and
// each sentence uses exactly the placeholders its variables fill.
import { describe, expect, it } from "vitest";
import en from "@/i18n/en.json";
import id from "@/i18n/id.json";
import { KINDS, SENTENCE_VARS } from "@/modules/notifications/types";

describe("notification copy", () => {
  it.each(KINDS)("%s has matching placeholders in en and id", (kind) => {
    for (const catalog of [en, id] as Record<string, string>[]) {
      const sentence = catalog[`notif.${kind}`];
      expect(sentence).toBeTruthy();
      expect(catalog[`notif.label.${kind}`]).toBeTruthy();
      const used = [...sentence.matchAll(/\{(\d)\}/g)].map((m) => Number(m[1])).sort();
      expect([...new Set(used)]).toEqual(SENTENCE_VARS[kind].map((_, i) => i));
    }
  });
});
