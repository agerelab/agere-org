// Role × action matrix and guardrails (PRD-04 §6.2).
import type { Role } from "@/lib/context";

export type GovAction =
  | "members.view"
  | "members.invite"
  | "members.manage"
  | "teams.manage"
  | "apps.manage"
  | "audit.view"
  | "org.edit"
  | "org.delete"
  | "ownership.transfer";

const ADMIN_ACTIONS: ReadonlySet<GovAction> = new Set(["members.view", "members.invite", "members.manage", "teams.manage", "apps.manage", "audit.view", "org.edit"]);

export function can(role: Role, action: GovAction): boolean {
  if (role === "owner") return true;
  if (role === "admin") return ADMIN_ACTIONS.has(action);
  return action === "members.view";
}

export const isAdminRole = (role: Role) => role === "owner" || role === "admin";

/**
 * May `actor` suspend, remove or change the role of someone who holds `target`? G1: an Admin never
 * acts on an Owner or another Admin; Members act on nobody. The last-Owner rule (G3) is checked
 * with the data, not here.
 */
export function canActOn(actor: Role, target: Role): boolean {
  if (actor === "owner") return true;
  if (actor === "admin") return target === "member";
  return false;
}

/** May `actor` move someone from `from` to `to`? Only Owners grant or remove the Owner role. */
export function canChangeRole(actor: Role, from: Role, to: Role): boolean {
  if (!canActOn(actor, from)) return false;
  if (to === "owner" || from === "owner") return actor === "owner";
  return true;
}
