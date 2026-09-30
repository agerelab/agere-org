---
name: ds-screen
description: Build a screen from the prototype with Agere DS components only, the five states and i18n keys in both languages.
---

Prompt template (PLAN-01 §4):

```text
Build screen {route} per PRD-{xx} US-{n} and prototype v18.7 ({prototype route}).
Components: Agere DS 6.4 only ({component list}). Header actions: PageHeaderActions
(1 default, ≤ 2 outline, ⋯). Five states: Ideal · Empty · Loading · Error · Partial
(copy from the PRD, i18n keys en + id). No placeholder in authoring fields. No UI string
written directly. Done when: AC tests green, UI/i18n/layout lints green, axe 0 critical/serious.
```

Steps: open the prototype screen in `docs/prototipe/`; list DS components and new i18n keys in the
Implementation Plan; build against the fake (`NEXT_PUBLIC_FAKE_BACKEND=1`); attach a walkthrough
(light/dark, 1440/390 px, EN/ID).
