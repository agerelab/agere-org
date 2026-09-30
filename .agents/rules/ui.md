# UI (UI-01 v2.13, Agere DS 6.4)

- Only Agere DS components and tokens (`src/ui/`). No new visual component without the DS.
- Page header: title, one sentence, secondary actions, **at most one default (primary) button**,
  at most two outline buttons, `⋯` last (UI-01 "Aksi & CTA"). A page-level action appears once
  per screen; empty states never repeat header actions.
- **Five states on every screen:** Ideal · Empty · Loading · Error · Partial, with copy from the PRD.
- **No placeholder text in authoring fields** (D33); placeholders only in search fields.
- Icon buttons have an accessible name. No solid red on pages.
- Only the content area scrolls; global surfaces (agent launcher, toasts) never cover actions.
- Every modal traps focus (including tablists with roving tabindex) and returns focus to its
  trigger on close.
- Theme: light by default, dark and "follow system" available (PRD-12 §5.3).
- Layout holds text +35 % longer than the shortest language without clipping.
- The prototype (`docs/prototipe/agere-org-prototipe-v18-7.html`) is the behavior and look
  reference; scope still comes from PRD-00.
