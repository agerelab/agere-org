// @mentions in task comments (PRD-06 §5 Should, PRD-10 §5): "@Rina Kusuma" names a person who can view
// the project. Pure, so the composer can use the same rule to suggest names.

export type Mentionable = { id: string; name: string };

/** Ids of the people whose full name follows an "@" in the text (case-insensitive, longest name first). */
export function findMentions(text: string, people: Mentionable[]): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  const taken: [number, number][] = [];
  for (const p of [...people].sort((a, b) => b.name.length - a.name.length)) {
    const needle = `@${p.name.toLowerCase()}`;
    let at = lower.indexOf(needle);
    while (at !== -1) {
      const end = at + needle.length;
      const boundary = end === lower.length || !/[\p{L}\p{N}]/u.test(lower[end]);
      // A shorter name inside an already matched longer one ("@Rina" in "@Rina Kusuma") does not count.
      if (boundary && !taken.some(([s, e]) => at >= s && at < e)) {
        found.add(p.id);
        taken.push([at, end]);
      }
      at = lower.indexOf(needle, at + 1);
    }
  }
  return [...found];
}

/** The "@query" being typed at the caret, if any ("…halo @ri|" → "ri"). */
export function mentionQuery(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const m = /(^|\s)@([\p{L}\p{N} .'-]{0,40})$/u.exec(before);
  if (!m) return null;
  return { start: caret - m[2].length - 1, query: m[2] };
}
