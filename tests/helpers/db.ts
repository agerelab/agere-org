import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { setDbForTests, type Db } from "@/db/client";
import { migrationFiles } from "@/db/migrations";
import * as schema from "@/db/schema";

// One migrated in-memory database per test file (starting PGlite takes seconds); freshDb() empties it,
// keeping the reference data that migrations seed.
const SEEDED = new Set(["schema_migrations", "app_registry"]);
let shared: Promise<{ db: Db; pg: PGlite; tables: string[] }> | undefined;

async function boot() {
  const pg = new PGlite();
  for (const m of migrationFiles()) await pg.exec(m.sql);
  const { rows } = await pg.query<{ tablename: string }>("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
  return { pg, db: drizzle(pg, { schema }) as unknown as Db, tables: rows.map((r) => r.tablename).filter((t) => !SEEDED.has(t)) };
}

/** An empty database with every migration applied, installed as getDb(). */
export async function freshDb(): Promise<{ db: Db; pg: PGlite }> {
  shared ??= boot();
  const { db, pg, tables } = await shared;
  await pg.exec(`TRUNCATE ${tables.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY`);
  setDbForTests(db);
  return { db, pg };
}
