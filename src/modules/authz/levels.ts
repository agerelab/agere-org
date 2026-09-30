import type { AclLevel } from "@/db/schema";

export type Level = "none" | AclLevel;
const ORDER: Record<Level, number> = { none: 0, view: 1, edit: 2, manage: 3 };

export const atLeast = (have: Level, need: Level) => ORDER[have] >= ORDER[need];
export const maxLevel = (levels: Level[]): Level => levels.reduce<Level>((a, b) => (ORDER[b] > ORDER[a] ? b : a), "none");
export const byLevelDesc = (a: Level, b: Level) => ORDER[b] - ORDER[a];
