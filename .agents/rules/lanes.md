# Code lanes (PLAN-01 §5)

## Free lane
DS screens, the five states, microcopy, styling, fakes, seed data, read-only pages. Agents may work
without step-by-step approval; review happens through the Vercel preview and walkthrough.

## Locked lane
- `authz` and the access matrix
- repositories and migrations
- `events.publish` + audit
- purge and deletion (PRD-13)
- Work Ownership (PRD-03)
- saving task order and moving tasks
- locale resolution and email rendering
- Agent runtime: permission policy, write tools, metering (PRD-17)

In a locked lane, **a person writes and approves the tests before implementation**. Agents do
not create, loosen or delete these tests. Test files are protected by CODEOWNERS, and the PR
author must be able to explain every line.
