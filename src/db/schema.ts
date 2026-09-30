// Drizzle mirror of db/migrations/*.sql. The SQL files are the source of truth (forward-only,
// PLAN-01 §3); every tenant table has organization_id as the first column of every index
// (TECH-01 §4). Tables arrive with their module, starting with identity and org (PLAN-01 §7, W1–W7).
export {};
