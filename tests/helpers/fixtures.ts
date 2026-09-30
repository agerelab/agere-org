import { eq } from "drizzle-orm";
import { memberships, teamMembers, teams, users } from "@/db/schema";
import type { Db } from "@/db/client";
import type { RequestContext, Role } from "@/lib/context";
import { uuidv7 } from "@/lib/ids";
import { createOrganization } from "@/modules/org/service";

/** A verified user. */
export async function makeUser(db: Db, name: string, email = `${name.toLowerCase().replace(/\s+/g, ".")}@maju.co.id`) {
  const id = uuidv7();
  await db.insert(users).values({ id, email, name, emailVerifiedAt: new Date() });
  return (await db.select().from(users).where(eq(users.id, id)))[0];
}

/** An organization created through the real service (Owner membership, Space enabled for everyone). */
export async function makeOrg(ownerId: string, slug = "maju-jaya", name = "Maju Jaya") {
  const r = await createOrganization(ownerId, { name, slug, timezone: "Asia/Jakarta", defaultLocale: "id" });
  if (!r.ok) throw new Error(`org ${slug}: ${r.code}`);
  return r.org;
}

export async function addMember(db: Db, organizationId: string, userId: string, role: Role = "member", status: "active" | "suspended" = "active") {
  await db.insert(memberships).values({ organizationId, userId, role, status });
}

export async function makeTeam(db: Db, organizationId: string, name: string, memberIds: string[], createdBy: string) {
  const id = uuidv7();
  await db.insert(teams).values({ organizationId, id, name, createdBy });
  if (memberIds.length) await db.insert(teamMembers).values(memberIds.map((userId) => ({ organizationId, teamId: id, userId })));
  return id;
}

export const ctxFor = (organizationId: string, userId: string, role: Role): RequestContext => ({ requestId: "req-test", organizationId, userId, role });
