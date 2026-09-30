# UI

Product-level UI built **only** from Agere DS 6.4 components and tokens (`src/components/`, see its
README) and the rules in UI-01 and `.agents/rules/ui.md`. Tailwind classes use the DS preset tokens
(`bg-muted`, `text-subtle`, `shadow-elevation-2`, `type-heading-xl`, …); no raw colours.

| Folder | What |
|---|---|
| `shell/` | App shell (UI-01 "Navigasi ganda"): rail, contextual panel, topbar, inset content, page frame |

Shared primitives from TECH-01 §8 (`GuidePanel`, `CuList`, `Dialog` dirty guard, `StateGate`,
`ResponsiveTable`, …) are added here as their slices land and are reused by every screen.
