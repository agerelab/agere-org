# agere/org

**Organization Operating System** — one organization, one context, many Agere apps.
agere/org is the platform layer for identity, organization, people, access, work (Space),
knowledge, notifications and audit.

- **Stack:** Next.js 16 (App Router) + React 19 + TypeScript, PostgreSQL with Drizzle ORM, Zod,
  Vitest; hosted on Vercel (region Singapore). One modular monolith, one database (TECH-01).
- **UI:** Agere DS 6.4 (shadcn/ui visual language, Radix, Tailwind 3.4), vendored in `src/components/`.
- **Languages:** English (default) and Bahasa Indonesia (D45).
- **Spec:** the PRD package in [`docs/`](docs/00-PRD-INDEX.md) (v2.9) is the source of truth.
  Delivery plan: [`docs/PLAN-01-VIBE-CODING.md`](docs/PLAN-01-VIBE-CODING.md).
- **Coding agents:** start with [`AGENTS.md`](AGENTS.md) and `.agents/rules/`.

## Getting started

```bash
npm install
cp .env.example .env.local   # optional locally: defaults to the embedded database
npm run dev                  # http://localhost:3000
```

Locally the database is an embedded Postgres (PGlite) in `.data/`, created and migrated by
`npm run dev`. For a ready account run `npm run db:seed` and sign in as `rina@maju.co.id` /
`agere-demo-2026` (organization **Maju Jaya**). Or sign up: without an email provider, verification
and reset links are printed in the terminal running `npm run dev`.

| Command | What it does |
|---|---|
| `npm run dev` | Local development server |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint (incl. no raw SQL outside repositories) |
| `npm test` | Vitest (unit, contract, i18n parity) |
| `npm run build` | Production build |
| `npm run db:migrate` | Apply `db/migrations/*.sql` (forward-only); runs before `npm run dev` |
| `npm run db:seed` | Demo account and organization (local only) |

## Layout

```text
docs/            PRD package v2.9 + prototypes (source of truth)
.agents/         rules and skills for coding agents (PLAN-01 §3)
src/app/         Next.js routes (per UI-01)
src/modules/     one folder per module (TECH-01 §3)
src/contracts/   Zod contracts + ActionResult (TECH-01 §5.3, §7)
src/i18n/        en.json (source) · id.json · format.ts
src/components/  Agere DS 6.4 (vendored, do not edit)
src/ui/          product UI built from the DS (app shell, …)
src/db/          database client and Drizzle schema
db/migrations/   forward-only SQL
tests/           ac · tenancy · a11y · lint · visual · unit
```
