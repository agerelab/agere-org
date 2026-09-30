---
name: new-server-action
description: Add a Server Action with its Zod contract, fake, real implementation and tests, following TECH-01 §5.2 and §7.
---

1. Contract: input and output schemas in `src/contracts/<module>.ts` (name from TECH-01 §7).
   Inputs that edit a row carry `version`; dates and ids are strings on the wire.
2. Fake: in-memory implementation in `src/contracts/fakes/<module>.ts` with prototype seed data.
3. Action: `"use server"`; parse with Zod → `VALIDATION`; build `ctx`; `authz.check`; then the
   repository call inside a transaction with `events.publish(tx, …)`; return `ActionResult<T>`.
4. Optimistic concurrency: `UPDATE … WHERE id AND organization_id AND version` → 0 rows = `VERSION_CONFLICT`.
5. After commit: `waitUntil(events.dispatch(id))`, `revalidateTag(...)` with the TECH-01 §8 tags.
6. Tests: one contract test file run against both the fake and the real adapter (TECH-01 §11),
   plus AC and tenancy tests.
