// Navigation model of the shell (UI-01 "Navigasi ganda"). Release 1 shows Desk and Space on the rail;
// Chat, Doc and Agen appear when their apps ship. Paths are relative to /{slug}.
import type { MessageKey } from "@/i18n";
import type { Role } from "@/lib/context";

export type SectionId = "desk" | "space" | "manage";
export type NavLink = { key: MessageKey; path: string; adminOnly?: boolean };

export const RAIL: { id: SectionId; key: MessageKey; path: string }[] = [
  { id: "desk", key: "nav.desk", path: "desk/kotak-masuk" },
  { id: "space", key: "nav.space", path: "s" },
];

export const DESK_LINKS: NavLink[] = [
  { key: "nav.inbox", path: "desk/kotak-masuk" },
  { key: "nav.myTasks", path: "desk/tugas-saya" },
];

/**
 * Kelola › Organisasi (PRD-02 §6.6). Owner/Admin-only entries are hidden from members. Umum is
 * visible to members read-only: PRD-02 §6.6 wins over UI-01's "khusus Owner/Admin" (PLAN-01 §2).
 */
export const ORG_LINKS: NavLink[] = [
  { key: "nav.general", path: "organisasi/umum" },
  { key: "nav.members", path: "organisasi/anggota" },
  { key: "nav.teams", path: "organisasi/tim" },
  { key: "nav.access", path: "organisasi/akses", adminOnly: true },
  { key: "nav.apps", path: "organisasi/aplikasi", adminOnly: true },
  { key: "nav.audit", path: "organisasi/audit", adminOnly: true },
  { key: "nav.trash", path: "organisasi/sampah" },
];

export const isAdmin = (role: Role) => role === "owner" || role === "admin";

export const orgLinksFor = (role: Role) => ORG_LINKS.filter((l) => !l.adminOnly || isAdmin(role));

/** Kelola opens the first Organisasi page the viewer may see. */
export const manageHome = (role: Role) => orgLinksFor(role)[0].path;

/** Which rail section a path (relative to /{slug}) belongs to. */
export function sectionOf(path: string): SectionId {
  const head = path.split("/")[0];
  if (head === "s") return "space";
  if (head === "organisasi") return "manage";
  return "desk";
}

/** Title key of the page at a path, for breadcrumbs and document titles. */
export function pageKey(path: string): MessageKey | undefined {
  return [...DESK_LINKS, ...ORG_LINKS].find((l) => l.path === path)?.key;
}
