---
name: a11y-check
description: Accessibility check on touched screens - axe, focus order, focus trap in modals and accessible names.
---

1. Run axe on every touched screen in both themes; 0 critical/serious (gate G6).
2. Keyboard: every action reachable, visible focus, logical order.
3. Every modal traps focus (tablists with roving tabindex included) and returns focus to its
   trigger on close; Esc closes.
4. Icon buttons have an `aria-label` from the catalog (translated).
5. Record what a person still has to test manually (screen reader) in the PR.
