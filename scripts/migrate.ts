// npm run db:migrate — applies db/migrations/*.sql to DATABASE_URL (Postgres or a local PGlite folder).
import nextEnv from "@next/env";
import postgres from "postgres";
import { runMigrations } from "../src/db/migrations";
import { databaseUrl, openPglite } from "../src/db/client";

nextEnv.loadEnvConfig(process.cwd());
const url = databaseUrl();

if (url.startsWith("pglite://")) {
  const pg = openPglite(url);
  await runMigrations(
    {
      exec: async (s) => void (await pg.exec(s)),
      applied: async () => new Set((await pg.query<{ name: string }>("SELECT name FROM schema_migrations")).rows.map((r) => r.name)),
      apply: async (name, s) =>
        void (await pg.transaction(async (tx) => {
          await tx.exec(s);
          await tx.query("INSERT INTO schema_migrations (name) VALUES ($1)", [name]);
        })),
    },
    console.log,
  );
  await pg.close();
} else {
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  await runMigrations(
    {
      exec: async (s) => void (await sql.unsafe(s)),
      applied: async () => new Set((await sql<{ name: string }[]>`SELECT name FROM schema_migrations`).map((r) => r.name)),
      apply: async (name, s) =>
        void (await sql.begin(async (tx) => {
          await tx.unsafe(s);
          await tx`INSERT INTO schema_migrations (name) VALUES (${name})`;
        })),
    },
    console.log,
  );
  await sql.end();
}
