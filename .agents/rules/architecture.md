# Architecture (TECH-01 P1–P8, §5, §10)

- One Next.js modular monolith, one Postgres. Module layout: `src/modules/<module>/` with
  `domain`, `repository`, `actions`, `loaders`, `events`, and tests.
- A module owns its tables (TECH-01 §3) and **never reads another module's tables**. Cross-module
  calls only through `authz`, `events.publish`, Work Ownership and Schedulable.
- `ctx: RequestContext` is always the **first argument** of a repository function. The repository
  adds `organization_id = ctx.organizationId` to every query itself.
- **No raw SQL outside a repository** (ESLint blocks `sql` from `drizzle-orm` and `postgres` elsewhere).
- Reads: RSC loaders. Writes: Server Actions. Route Handlers only for polling, cron, webhooks and
  (release 2) external APIs.
- Every action parses input with the Zod schema in `src/contracts/<module>.ts` and returns
  `ActionResult<T>` (`src/contracts/result.ts`, TECH-01 §5.3). Inputs that edit a row carry `version`.
- Mutation, event and audit commit in **one transaction** (`events.publish(tx, …)`); side effects
  run after commit and are idempotent (PRD-00b).
- Ids are UUIDv7 (`src/lib/ids.ts`). Soft delete uses `deleted_at` (Sampah, 30 days, PRD-13).
- Readable PII only in identity tables; elsewhere store `user_id` (TECH-01 P6).
- Internal ids never change; display names may (app id `space` is shown as "Space").
