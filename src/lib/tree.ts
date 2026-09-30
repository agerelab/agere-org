/**
 * Nested-list helpers (v6.4) for tasks → subtasks: drop-zone maths and a pure move function.
 * Pair them with @dnd-kit (pointer + keyboard sensors) and the row-menu alternatives
 * (Move up, Move down, Make subtask of…, Remove from parent) — see Patterns → Nested list.
 *
 * Items are one flat array; array order is sibling order. `group` is the top-level grouping
 * (a status column); subtasks keep their own `group` when they move.
 */
export type DropZone = "before" | "after" | "inside";

export interface TreeItem {
  id: string;
  parentId?: string | null;
  group?: string;
}

export type TreeDropTarget = { id: string; zone: DropZone } | { group: string };

/** Top 30 % → before · middle 40 % → inside (when nesting is allowed) · bottom 30 % → after. */
export function getDropZone(pointerY: number, rect: { top: number; height: number }, canNest: boolean): DropZone {
  const y = rect.height > 0 ? (pointerY - rect.top) / rect.height : 0.5;
  if (canNest && y > 0.3 && y < 0.7) return "inside";
  return y < 0.5 ? "before" : "after";
}

const byId = <T extends TreeItem>(items: T[], id: string) => items.find((i) => i.id === id);
const depthOf = <T extends TreeItem>(items: T[], item: T): number => {
  let d = 0;
  let p = item.parentId ? byId(items, item.parentId) : undefined;
  while (p && d < 50) { d++; p = p.parentId ? byId(items, p.parentId) : undefined; }
  return d;
};
const isDescendant = <T extends TreeItem>(items: T[], id: string, ancestorId: string): boolean => {
  let p = byId(items, id)?.parentId;
  for (let guard = 0; p && guard < 50; guard++) {
    if (p === ancestorId) return true;
    p = byId(items, p)?.parentId;
  }
  return false;
};
const hasChildren = <T extends TreeItem>(items: T[], id: string) => items.some((i) => i.parentId === id);

/** Whether moving `activeId` to `target` is allowed. `maxDepth` counts levels below the top (1 = one level of subtasks). */
export function canDrop<T extends TreeItem>(items: T[], activeId: string, target: TreeDropTarget, { maxDepth = 1 } = {}): boolean {
  const active = byId(items, activeId);
  if (!active) return false;
  if ("group" in target) return true;
  const over = byId(items, target.id);
  if (!over || over.id === active.id) return false;
  if (isDescendant(items, over.id, active.id)) return false; // never into its own subtree
  if (target.zone === "inside") {
    if (active.parentId === over.id) return false; // already there
    const subtreeDepth = hasChildren(items, active.id) ? 1 : 0;
    return depthOf(items, over) + 1 + subtreeDepth <= maxDepth;
  }
  return depthOf(items, over) + (hasChildren(items, active.id) ? 1 : 0) <= maxDepth;
}

/**
 * Returns a new array with `activeId` moved. Invalid moves return the input unchanged (same reference),
 * so `if (next !== items)` tells you whether anything happened.
 */
export function moveTreeItem<T extends TreeItem>(items: T[], activeId: string, target: TreeDropTarget, opts: { maxDepth?: number } = {}): T[] {
  if (!canDrop(items, activeId, target, opts)) return items;
  const active = byId(items, activeId)!;
  const rest = items.filter((i) => i.id !== activeId);
  let moved: T;
  let at: number;
  if ("group" in target) {
    moved = { ...active, parentId: null, group: target.group };
    const lastInGroup = rest.map((i, idx) => (!i.parentId && i.group === target.group ? idx : -1)).filter((i) => i >= 0).pop();
    at = lastInGroup === undefined ? rest.length : lastInGroup + 1;
  } else {
    const over = byId(rest, target.id)!;
    const overIdx = rest.indexOf(over);
    if (target.zone === "inside") {
      moved = { ...active, parentId: over.id };
      const lastChild = rest.map((i, idx) => (i.parentId === over.id ? idx : -1)).filter((i) => i >= 0).pop();
      at = (lastChild ?? overIdx) + 1;
    } else {
      moved = over.parentId ? { ...active, parentId: over.parentId } : { ...active, parentId: null, group: over.group };
      at = target.zone === "before" ? overIdx : overIdx + 1;
    }
  }
  return [...rest.slice(0, at), moved, ...rest.slice(at)];
}

/** Siblings of `id` in order (same parent; top-level siblings share the same group). */
export function siblingsOf<T extends TreeItem>(items: T[], id: string): T[] {
  const it = byId(items, id);
  if (!it) return [];
  return items.filter((i) => (i.parentId ?? null) === (it.parentId ?? null) && (it.parentId ? true : i.group === it.group));
}
