# Tests (PLAN-01 §3, §6)

| Folder | What goes here | CI gate |
|---|---|---|
| `ac/` | Tests generated from each story's Given-When-Then AC (skill `gherkin-to-test`) | AC (G1) |
| `tenancy/` | Cross-organization 404, suspended, removed, app disabled — for every loader and action | Tenancy (G2) |
| `a11y/` | axe 0 critical/serious and modal focus trap on touched screens | Accessibility (G6) |
| `lint/` | Project lints as tests: i18n parity; later UI/CTA and layout lints (UI-01) | Lint i18n / UI / layout |
| `visual/` | Screenshot baselines: light/dark, 1440/390 px | Visual |
| `unit/` | Unit and contract tests (fake and real adapter in the same file, TECH-01 §11) | Unit + contract |

Locked-lane tests (PLAN-01 §5) are written and approved by a person before implementation and are
protected by CODEOWNERS.
