// In-memory stand-in for identity (PRD-01) and org (PRD-02) until those modules land (TECH-01 §8,
// NEXT_PUBLIC_FAKE_BACKEND=1). Mirrors the prototype's demo organization.
import type { Role } from "@/lib/context";

export type ShellOrg = { slug: string; name: string };
export type ShellUser = { name: string; role: Role };
export type ShellData = { org: ShellOrg; user: ShellUser };

export const FAKE_ORG: ShellOrg = { slug: "maju-jaya", name: "Maju Jaya" };

const ROLES: readonly Role[] = ["owner", "admin", "member"];

export const fakeBackendEnabled = () => process.env.NEXT_PUBLIC_FAKE_BACKEND === "1";

/** The shell's org and viewer, or null when the slug is not one of the viewer's organizations (→ 404). */
export async function loadShell(slug: string): Promise<ShellData | null> {
  if (!fakeBackendEnabled() || slug !== FAKE_ORG.slug) return null;
  const role = ROLES.find((r) => r === process.env.DEV_ROLE) ?? "owner";
  return { org: FAKE_ORG, user: { name: "Rina Kusuma", role } };
}
