---
name: new-event
description: Add a cross-module event: catalog entry per PRD-00b, publish inside the transaction, audit flag and consumer.
---

1. Check the event catalog in `docs/PRD-00B-EVENT-CONTRACT.md` §8; add the entry there first
   (PR to `docs/` with a decision number) if it is missing.
2. Name `<module>.<object>.<verb>` (e.g. `space.task.assigned`); internal ids never renamed.
3. Envelope per PRD-00b §6: `event_id, type, version, organization_id, subject, actor, data,
   occurred_at`. `data` holds ids and codes only — no rendered sentences, no raw PII.
4. Publish with `events.publish(tx, …)` in the same transaction as the mutation; mark `audit: true`
   when the catalog says so.
5. Consumers are idempotent (unique `(event_id, consumer)`); test retry and duplicate delivery.
6. `events.publish` rejects an `organization_id` different from `ctx` — keep that test green.
