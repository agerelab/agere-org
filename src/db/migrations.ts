// Forward-only migrations (PLAN-01 §3): db/migrations/NNNN_*.sql applied in name order, once each.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const MIGRATIONS_DIR = join(process.cwd(), "db", "migrations");

export function migrationFiles(dir = MIGRATIONS_DIR): { name: string; sql: string }[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((name) => ({ name, sql: readFileSync(join(dir, name), "utf8") }));
}

/** The minimal driver surface both postgres-js and PGlite can offer. */
export type MigrationDriver = {
  exec(sql: string): Promise<void>;
  applied(): Promise<Set<string>>;
  apply(name: string, sql: string): Promise<void>;
};

export async function runMigrations(driver: MigrationDriver, log: (m: string) => void = () => {}) {
  await driver.exec("CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
  const done = await driver.applied();
  for (const f of migrationFiles()) {
    if (done.has(f.name)) continue;
    await driver.apply(f.name, f.sql);
    log(`applied ${f.name}`);
  }
}
