// npm run db:seed — a demo account and organization for local development (never in production).
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
if (process.env.NODE_ENV === "production") throw new Error("db:seed is for local development only");

const { getDb } = await import("../src/db/client");
const { users } = await import("../src/db/schema");
const identity = await import("../src/modules/identity/service");
const { setEmailSender } = await import("../src/modules/identity/email");
const { createOrganization } = await import("../src/modules/org/service");
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
console.log(`\nSign in at http://localhost:3000/masuk with ${DEMO.email} / ${DEMO.password}\n`);
process.exit(0);
