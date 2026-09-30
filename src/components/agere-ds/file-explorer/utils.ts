import type { FileGroup, FileItem } from "./types";

const DAY = 86_400_000;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Buckets items into Today / Yesterday / Earlier this week / Earlier (empty groups dropped). */
export function groupByRecency(items: FileItem[], now = new Date()): FileGroup[] {
  const today = startOfDay(now);
  const buckets: FileGroup[] = [
    { id: "today", title: "Today", items: [] },
    { id: "yesterday", title: "Yesterday", items: [] },
    { id: "week", title: "Earlier this week", items: [] },
    { id: "earlier", title: "Earlier", items: [] },
  ];
  for (const item of [...items].sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))) {
    const t = startOfDay(new Date(item.modifiedAt));
    const idx = t >= today ? 0 : t >= today - DAY ? 1 : t >= today - 6 * DAY ? 2 : 3;
    buckets[idx].items.push(item);
  }
  return buckets.filter((b) => b.items.length > 0);
}

export const AGERE_ITEM_MIME = "application/x-agere-file-items";
