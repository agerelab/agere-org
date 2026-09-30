// Hourly notification jobs (PRD-10 §6): 90-day retention and the "Jatuh tempo hari ini" digest (Should)
// at 08.00 in each person's timezone (PRD-12 §5.2: theirs, else the organization's), one item per
// person, organization and date.
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { memberships, organizations, users } from "@/db/schema";
import type { Role } from "@/lib/context";
import { todayIn } from "@/lib/dates";
import { uuidv7 } from "@/lib/ids";
import { myTasks } from "@/modules/space/queries";
import * as repo from "./repository";

const hourIn = (timeZone: string, now: Date) => Number(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(now));

export async function dueTodayDigest(now = new Date(), hour = 8) {
  const db = getDb();
  let created = 0;
  for (const org of await db.select().from(organizations).where(eq(organizations.status, "active"))) {
    const members = await db
      .select({ userId: memberships.userId, role: memberships.role, timezone: users.timezone })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(and(eq(memberships.organizationId, org.id), eq(memberships.status, "active")));
    for (const m of members) {
      const tz = m.timezone ?? org.timezone;
      if (hourIn(tz, now) !== hour) continue;
      const today = todayIn(tz, now);
      const ctx = { requestId: "digest", organizationId: org.id, userId: m.userId, role: m.role as Role };
      const due = (await myTasks(ctx)).filter((x) => !x.done && x.dueDate === today);
      if (!due.length) continue;
      created += await repo.insertMany(db, [
        {
          organizationId: org.id,
          id: uuidv7(),
          recipientUserId: m.userId,
          dedupeKey: `digest:${today}`,
          type: "due_today",
          vars: { count: due.length },
          targetUrl: `/${org.slug}/desk/tugas-saya`,
          createdAt: now,
        },
      ]);
    }
  }
  return created;
}

export async function hourlyNotificationJobs(now = new Date()) {
  const purged = await repo.purgeOld(getDb());
  const digests = await dueTodayDigest(now);
  return { purged, digests };
}
