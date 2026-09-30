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
  // people (PRD-03)
  "membership.invitation.created": org(true),
  "membership.invitation.resent": org(true),
  "membership.invitation.revoked": org(true),
  "membership.invitation.expired": org(true),
  "membership.member.activated": org(true, ["notifications"]),
  "membership.member.suspended": org(true, ["notifications"]),
  "membership.member.reactivated": org(true, ["notifications"]),
  "membership.member.removed": org(true, ["notifications"]),
  "membership.member.left": org(true),
  "membership.work.reassigned": org(false, ["notifications"]),
  "team.team.created": org(true),
  "team.team.renamed": org(true),
  "team.team.deleted": org(true),
  "team.member.added": org(true),
  "team.member.removed": org(true),
  // access (PRD-04)
  "access.role.changed": org(true, ["notifications"]),
  "access.app.enabled": org(true),
  "access.app.disabled": org(true),
  "access.app_grant.created": org(true, ["notifications"]),
  "access.app_grant.revoked": org(true, ["notifications"]),
  "access.acl.changed": org(true),
  "access.override_used": org(true),
  // space (PRD-06 §7); the internal id stays "space" whatever the display name
  "space.space.created": org(false),
  "space.space.updated": org(false),
  "space.space.deleted": org(true),
  "space.project.created": org(false),
  "space.project.updated": org(false),
  "space.project.archived": org(false),
  "space.project.restored": org(false),
  "space.project.moved": org(false),
  "space.project.deleted": org(true),
  "space.task.created": org(false),
  "space.task.updated": org(false),
  "space.task.deleted": org(false),
  "space.task.assigned": org(false, ["notifications"]),
  "space.comment.created": org(false, ["notifications"]),
} as const satisfies Record<string, CatalogEntry>;

export type EventType = keyof typeof CATALOG;
