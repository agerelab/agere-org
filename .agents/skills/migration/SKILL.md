---
name: migration
description: Write a forward-only SQL migration with organization_id first in every index, plus the Drizzle mirror.
---

1. New file `db/migrations/NNNN_<description>.sql` (next number); never edit an applied file.
2. Every tenant table: `organization_id uuid not null`, **first column of every index** and of the
   primary key where composite. Ids UUIDv7. Soft delete via `deleted_at timestamptz`.
3. Mirror the tables in `src/db/schema.ts` (the SQL file stays the source of truth).
4. Include the indexes TECH-01 §4 requires for the tables you add.
5. Locked lane: a person approves the migration before merge.
6. Test by applying all migrations to PGlite in the test helper.
