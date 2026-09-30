# Security

- Authorization always on the server (`authz.check` / `checkBatch` / `filter`, PRD-04 §6). No
  decision cache in release 1.
- Another organization's id returns **404**, never 403 (never reveal existence, PRD-02).
- Sensitive actions (`transferOwnership`, `scheduleDeletion`, `unlinkGoogle`,
  `requestAccountDeletion`) return `REAUTH_REQUIRED` after 10 minutes since last authentication.
- Logs carry ids only; emails are masked (PRD-13).
- Secrets live only in Vercel environment variables; never in code, tests, fixtures or prompts.
- The AI agent (PRD-17) writes only through registered tools, within the invoking user's permissions.
- Cron routes check `Authorization: Bearer ${CRON_SECRET}`.
