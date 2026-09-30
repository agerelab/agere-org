# Agere DS 6.4.0 (vendored)

Copied unchanged from the Agere Design System package `@agere/design-system` 6.4.0, the same way
shadcn/ui components are added to a project. It uses the shadcn aliases, which match this repo's
`@/*` → `src/*`:

| Path | From the DS |
|---|---|
| `src/components/ui/` | shadcn-compatible primitives (Button, Dialog, PageHeader, EmptyState, …) |
| `src/components/agere-ds/` | workspace modules (Kanban, DataTable, TaskDrawer, Calendar, …) |
| `src/lib/{agere-tokens,date,dev,theme,tree,utils,workspace}.ts` | helpers (`cn`, date, tree, theme) |
| `src/hooks/`, `src/brand/`, `src/icons/`, `src/tokens/`, `src/styles/` | hooks, logo, icons, generated tokens, `globals.css` |
| `tailwind.preset.ts` (repo root) | Tailwind 3.4 preset |

Rules:
- **Do not edit these files.** A change goes to the DS first; upgrade by copying the new release
  over these paths in one PR (note the version here and in `AGENTS.md`).
- They are excluded from ESLint here (linted and tested upstream) but still typechecked.
- License: MIT, see `AGERE-DS-LICENSE`. The agere name and logos are trademarks (not MIT).
