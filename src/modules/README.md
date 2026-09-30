# Modules (TECH-01 §3)

One folder per module: `domain · repository · actions · loaders · events · tests`. A module owns its
tables and never reads another module's tables; modules talk only through in-process interfaces
(`authz`, `events.publish`, Work Ownership, Schedulable). Repositories take `ctx` first and add
`organization_id` themselves.

| Module | PRD | Release |
|---|---|---|
| `identity` | PRD-01, 12, 18 | 1 |
| `org` | PRD-02 | 1 |
| `people` | PRD-03 | 1 |
| `authz` | PRD-04 | 1 |
| `space` (shown as Space) | PRD-06 | 1 |
| `events` | PRD-00b | 1 |
| `audit` | PRD-11 | 1 |
| `notifications` | PRD-10 | 1 |
| `lifecycle` | PRD-13 | 1 |
| `chat` | PRD-14 | 2 (candidate) |
| `agent` | PRD-17 | 3 (proposed) |
