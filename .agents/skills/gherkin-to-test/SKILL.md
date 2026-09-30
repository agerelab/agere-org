---
name: gherkin-to-test
description: Turn the Given-When-Then acceptance criteria of a PRD user story into Vitest (or Playwright) tests in tests/ac/ before any implementation.
---

1. Read the story and its AC in `docs/PRD-xx-*.md`; note the PRD version you read.
2. One `describe` per story (`PRD-06 US-2 …`), one `it` per AC, named after the AC's Then.
3. Given → fixtures (PGlite database or the module fake); When → call the action or loader;
   Then → assert on the `ActionResult`, the database rows and the published events.
4. Add the tenancy case for every loader and action touched: a user of another organization
   gets `NOT_FOUND` (put it in `tests/tenancy/`).
5. Locked lane (`.agents/rules/lanes.md`)? Stop after writing the tests and ask a person to approve them.
6. Run `npm test`; the new tests must fail for the right reason before implementation starts.
