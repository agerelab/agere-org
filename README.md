# agere/org

**Organization Operating System** — one organization, one context, many Agere apps.
agere/org is the platform layer for identity, organization, people, access, work (Space),
knowledge, notifications and audit.

- **Stack:** Next.js 16 (App Router) + React 19 + TypeScript, PostgreSQL with Drizzle ORM, Zod,
  Vitest; hosted on Vercel (region Singapore). One modular monolith, one database (TECH-01).
- **Languages:** English (default) and Bahasa Indonesia (D45).
- **Spec:** the PRD package in [`docs/`](docs/00-PRD-INDEX.md) (v2.9) is the source of truth.
  Delivery plan: [`docs/PLAN-01-VIBE-CODING.md`](docs/PLAN-01-VIBE-CODING.md).
- **Coding agents:** start with [`AGENTS.md`](AGENTS.md) and `.agents/rules/`.

## Getting started

```bash
npm install
cp .env.example .env.local   # set DATABASE_URL
npm run dev                  # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run dev` | Local development server |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint (incl. no raw SQL outside repositories) |
| `npm test` | Vitest (unit, contract, i18n parity) |
| `npm run build` | Production build |
| `npm run db:migrate` | Apply `db/migrations/*.sql` (forward-only) |

## Layout

```text
docs/            PRD package v2.9 + prototypes (source of truth)
.agents/         rules and skills for coding agents (PLAN-01 §3)
src/app/         Next.js routes (per UI-01)
src/modules/     one folder per module (TECH-01 §3)
src/contracts/   Zod contracts + ActionResult (TECH-01 §5.3, §7)
src/i18n/        en.json (source) · id.json · format.ts
src/ui/          Agere DS components only
src/db/          database client and Drizzle schema
db/migrations/   forward-only SQL
tests/           ac · tenancy · a11y · lint · visual · unit
```
