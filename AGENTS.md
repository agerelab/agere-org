# agere/org — instructions for coding agents

agere/org is the Organization Operating System of Agere: one Next.js modular monolith and one
Postgres, hosted on Vercel (region Singapore). **The spec is the prompt** (PLAN-01): every change
starts from a user story with Given-When-Then AC, one prototype screen and existing Agere DS
components. Code that cannot be traced to an AC is not merged.

## Source of truth

Read the PRD package in `docs/` (index: `docs/00-PRD-INDEX.md`, pinned at **v2.9**). When documents
disagree, the one further left wins (PLAN-01 §2):

```text
PRD (behavior, scope, AC) → TECH-01 (data & flow contract) → UI-01 (layout & UI rules)
  → Agere DS 6.4 (tokens & components) → prototype v18.7 (docs/prototipe/) → code
```

Name any conflict in your Implementation Plan; never pick a side yourself. Release scope is set by
PRD-00 only. PRD changes go through a PR to `docs/` with a decision number (D-xx).

## Personas

| Persona | Works on | Must |
|---|---|---|
| `@be` | `src/modules/*` (domain, repository, actions, loaders, events), `src/contracts/`, `db/migrations/` | Follow `.agents/rules/architecture.md` and `security.md`; locked-lane tests approved by a person first |
| `@fe` | `src/app/`, `src/ui/`, `src/i18n/` (DS: `src/components/`, read-only) | Follow `.agents/rules/ui.md` and `i18n.md`; five states per screen; build against fakes |
| `@qa` | `tests/` | Generate tests from AC before implementation; tenancy matrix for every loader and action |
| `@copy` | `src/i18n/*.json` | English is the source, Bahasa Indonesia the translation; sentence case, verb + object |

## Binding rules (details in `.agents/rules/`)

1. **Tenancy:** `ctx` (`RequestContext`) is the first argument of every repository function; the
   repository adds `organization_id` itself. A module never reads another module's tables.
2. **Authorization on the server, every time** through `authz` (PRD-04 §6). UI hiding is a convenience.
3. **Reads via RSC loaders, writes via Server Actions** returning `ActionResult<T>`
   (`src/contracts/result.ts`). Route Handlers only for polling, cron, webhooks.
4. **Mutation + event + audit in one transaction** (`events.publish(tx, …)`, PRD-00b).
5. **No raw SQL outside a module repository or `src/db`** (enforced by ESLint).
6. **No UI string in components**: everything through `t()`, keys in `en.json` and `id.json`.
7. **Only Agere DS components and tokens** (vendored DS 6.4.0 in `src/components/`, never edited
   here); one default button per screen; no placeholder text in authoring fields (D33).
8. **Locked lanes** (`.agents/rules/lanes.md`): do not write or change their tests yourself.
9. Slices are at most one ideal day; a PR over 400 changed lines is rejected unless it is a
   migration or generated.

## Commands

```bash
npm run dev         # local app on :3000 (migrates the local PGlite database first)
npm run db:seed     # demo account rina@maju.co.id / agere-demo-2026 + Maju Jaya
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest
npm run build       # next build
npm run db:migrate  # apply db/migrations/*.sql (forward-only)
```

A slice is done only when typecheck, lint, tests and build are green (PLAN-01 §13).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
