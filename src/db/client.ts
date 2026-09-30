import { mkdirSync } from "node:fs";
import { sql } from "drizzle-orm";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { drizzle as drizzleLite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/** Any Drizzle Postgres database (postgres-js on Vercel, PGlite locally and in tests). */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
/** A transaction handle: the same query API, committed or rolled back as one unit. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * DATABASE_URL picks the driver:
 * - `postgres://…` — the Marketplace Postgres (PRD-00 D2); pooled, no prepared statements so it works
 *   behind transaction-mode poolers.
 * - `pglite://<folder>` — an embedded Postgres in a local folder, for development without a server.
 */
export function connect(url: string): Db {
  if (url.startsWith("pglite://")) return drizzleLite(openPglite(url), { schema }) as unknown as Db;
  return drizzlePg(postgres(url, { max: 5, prepare: false, idle_timeout: 20, connect_timeout: 10 }), { schema }) as unknown as Db;
}

/** Opens (and creates on first use) the PGlite folder named by a pglite:// URL. */
export function openPglite(url: string): PGlite {
  const dir = url.slice("pglite://".length);
  mkdirSync(dir, { recursive: true });
  return new PGlite(dir);
}

export const LOCAL_DATABASE_URL = "pglite://.data/agere-org";

/** DATABASE_URL, or the local PGlite folder outside production so `npm run dev` works with no setup. */
export function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url) return url;
  if (process.env.NODE_ENV === "production") throw new Error("DATABASE_URL is not set");
  return LOCAL_DATABASE_URL;
}

// Kept on globalThis so dev hot reloads reuse one connection (PGlite allows one process per folder).
const g = globalThis as { __agereDb?: Db; __agereDbOverride?: Db };

export function getDb(): Db {
  if (g.__agereDbOverride) return g.__agereDbOverride;
  if (!g.__agereDb) {
    g.__agereDb = connect(databaseUrl());
  }
  return g.__agereDb;
}

/** Tests swap in an in-memory PGlite database. */
export function setDbForTests(d: Db | undefined) {
  g.__agereDbOverride = d;
}

/** Health check: the database answers. */
export async function pingDb(): Promise<void> {
  await getDb().execute(sql`select 1`);
}
