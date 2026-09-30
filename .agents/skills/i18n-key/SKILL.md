---
name: i18n-key
description: Add or change a message key in both catalogs (en source, id translation) and check text length.
---

1. Key name: `<area>.<thing>` in lowerCamel (e.g. `task.new`, `members.invite`).
2. Add the English text to `src/i18n/en.json` (source) and the Indonesian text to
   `src/i18n/id.json`; take Indonesian microcopy from the PRD when it exists.
3. Same placeholders `{0}`, `{1}` in both; sentence case; verb + object.
4. The layout must hold the longer text +35 % without clipping.
5. Run `npm test` — `tests/lint/i18n.test.ts` checks parity.
