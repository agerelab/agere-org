# Migrations

Forward-only SQL files, applied in name order by `npm run db:migrate` (`NNNN_description.sql`).
Migrations are a locked lane (PLAN-01 §5): a person approves them before they merge. Every tenant
table carries `organization_id uuid not null`, first in every index (TECH-01 §4).
