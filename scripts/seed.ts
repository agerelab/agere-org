// npm run db:seed — a demo account and organization for local development (never in production).
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
if (process.env.NODE_ENV === "production") throw new Error("db:seed is for local development only");

const { getDb } = await import("../src/db/client");
const { users } = await import("../src/db/schema");
const identity = await import("../src/modules/identity/service");
const { setEmailSender } = await import("../src/modules/identity/email");
const { createOrganization } = await import("../src/modules/org/service");
const { resolveOrg } = await import("../src/modules/org/service");
const { createSpace } = await import("../src/modules/space/spaces");
const { createProject } = await import("../src/modules/space/projects");
const { createTask } = await import("../src/modules/space/tasks");
const { eq } = await import("drizzle-orm");

export const DEMO = { email: "rina@maju.co.id", password: "agere-demo-2026", name: "Rina Kusuma" };

setEmailSender(async () => {});
const db = getDb();
const meta = { appUrl: "http://localhost:3000" };
let [user] = await db.select().from(users).where(eq(users.email, DEMO.email));
if (!user) {
  await identity.signUp({ name: DEMO.name, email: DEMO.email, password: DEMO.password, locale: null }, meta);
  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.email, DEMO.email));
  [user] = await db.select().from(users).where(eq(users.email, DEMO.email));
  console.log(`created ${DEMO.email}`);
}
const r = await createOrganization(user.id, { name: "Maju Jaya", slug: "maju-jaya", timezone: "Asia/Jakarta", defaultLocale: "id" });
console.log(r.ok ? "created organization maju-jaya" : "organization maju-jaya already exists");

// Starter space and project (PRD-02 §6.3 "Mulai di sini" with 3 example tasks).
const org = await resolveOrg("maju-jaya", user.id);
if (org.ok) {
  const ctx = { requestId: "seed", organizationId: org.org.id, userId: user.id, role: org.role };
  const space = await createSpace(ctx, { name: "Umum", iconKey: "layers", description: "", access: "org" });
  if (space.ok) {
    const project = await createProject(ctx, space.id, { name: "Mulai di sini", description: "Contoh proyek untuk mencoba Papan dan Daftar." }, "id");
    if (project.ok) {
      const today = new Date();
      const iso = (days: number) => new Date(today.getTime() + days * 86_400_000).toISOString().slice(0, 10);
      await createTask(ctx, project.id, { title: "Undang tim Anda", assignee: { type: "user", id: user.id }, dueDate: iso(1), priority: "high" });
      await createTask(ctx, project.id, { title: "Buat proyek pertama", dueDate: iso(-2), priority: "medium" });
      await createTask(ctx, project.id, { title: "Coba geser kartu ini ke Selesai" });
      console.log("created space Umum with project Mulai di sini");
    }
  }
}
console.log(`\nSign in at http://localhost:3000/masuk with ${DEMO.email} / ${DEMO.password}\n`);
process.exit(0);
