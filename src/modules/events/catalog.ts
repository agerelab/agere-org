// Event catalog (PRD-00b §8.1). `audit` and `scope` come from here, never from the caller.
// Consumers are listed by name; a delivery row is created only for consumers registered in
// consumers.ts, so a consumer module that has not shipped yet receives nothing.

export type EventScope = "organization" | "user";
export type CatalogEntry = { scope: EventScope; audit: boolean; version: number; consumers: string[] };

const user = (consumers: string[] = ["notifications"]): CatalogEntry => ({ scope: "user", audit: false, version: 1, consumers });
const org = (audit: boolean, consumers: string[] = []): CatalogEntry => ({ scope: "organization", audit, version: 1, consumers });

export const CATALOG = {
  // identity (PRD-01)
  "security.session.revoked": user(),
  "security.login.failed_threshold": user(),
  "security.password.changed": user(),
  "security.account.linked": user(),
  "security.account.unlinked": user(),
  "security.mfa.changed": user(),
  "identity.account.deletion_requested": user(),
  "identity.account.deleted": user([]),
  // organization (PRD-02)
  "org.organization.created": org(true),
  "org.organization.updated": org(true),
  "org.ownership.transferred": org(true, ["notifications"]),
  "org.organization.deletion_scheduled": org(true, ["notifications"]),
  "org.organization.deletion_cancelled": org(true, ["notifications"]),
  "org.organization.suspended": org(true, ["notifications"]),
  "org.organization.reactivated": org(true, ["notifications"]),
} as const satisfies Record<string, CatalogEntry>;

export type EventType = keyof typeof CATALOG;
