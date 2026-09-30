// Drizzle mirror of db/migrations/*.sql. The SQL files are the source of truth (forward-only,
// PLAN-01 §3); tests apply them to PGlite and exercise these definitions against them.
import { bigserial, boolean, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true });

// ---------- identity (PRD-01) ----------
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  emailVerifiedAt: ts("email_verified_at"),
  locale: text("locale").$type<"en" | "id">(),
  timezone: text("timezone"),
  theme: text("theme").$type<"light" | "dark" | "system">().notNull().default("light"),
  lastOrganizationId: uuid("last_organization_id"),
  status: text("status").$type<"active" | "deleted">().notNull().default("active"),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const credentials = pgTable("credentials", {
  userId: uuid("user_id").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
  lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
  lastAuthAt: ts("last_auth_at").notNull().defaultNow(),
  expiresAt: ts("expires_at").notNull(),
  userAgent: text("user_agent"),
  ipHash: text("ip_hash"),
});

export const verificationTokens = pgTable("verification_tokens", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  purpose: text("purpose").$type<"verify_email" | "reset_password">().notNull(),
  expiresAt: ts("expires_at").notNull(),
  usedAt: ts("used_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const rateLimitHits = pgTable("rate_limit_hits", {
  key: text("key").notNull(),
  at: ts("at").notNull().defaultNow(),
});

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  lockedUntil: ts("locked_until").notNull(),
});

export const consents = pgTable("consents", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  kind: text("kind").$type<"terms" | "privacy">().notNull(),
  version: text("version").notNull(),
  acceptedAt: ts("accepted_at").notNull().defaultNow(),
  ipHash: text("ip_hash"),
});

// ---------- organization (PRD-02) and membership (PRD-03) ----------
export type OrgStatus = "active" | "suspended" | "pending_deletion";
export type MemberRole = "owner" | "admin" | "member";

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  legalName: text("legal_name"),
  defaultLocale: text("default_locale").$type<"en" | "id">().notNull().default("en"),
  timezone: text("timezone").notNull().default("Asia/Jakarta"),
  status: text("status").$type<OrgStatus>().notNull().default("active"),
  createdBy: uuid("created_by").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
  version: integer("version").notNull().default(1),
});

export const memberships = pgTable(
  "memberships",
  {
    organizationId: uuid("organization_id").notNull(),
    userId: uuid("user_id").notNull(),
    role: text("role").$type<MemberRole>().notNull(),
    status: text("status").$type<"active" | "suspended">().notNull().default("active"),
    joinedAt: ts("joined_at").notNull().defaultNow(),
    lastActiveAt: ts("last_active_at"),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.userId] })],
);

// ---------- events (PRD-00b) and audit (PRD-11) ----------
export const outboxEvents = pgTable("outbox_events", {
  seq: bigserial("seq", { mode: "number" }).primaryKey(),
  eventId: uuid("event_id").notNull().unique(),
  type: text("type").notNull(),
  version: integer("version").notNull(),
  scope: text("scope").$type<"organization" | "user">().notNull(),
  organizationId: uuid("organization_id"),
  occurredAt: ts("occurred_at").notNull(),
  recordedAt: ts("recorded_at").notNull().defaultNow(),
  producer: jsonb("producer").$type<{ module: string; release: string }>().notNull(),
  actor: jsonb("actor").$type<Record<string, unknown>>().notNull(),
  subject: jsonb("subject").$type<Record<string, unknown>>().notNull(),
  data: jsonb("data").$type<Record<string, unknown>>().notNull(),
  audit: boolean("audit").notNull(),
  pii: jsonb("pii").$type<string[]>().notNull().default([]),
  requestId: text("request_id"),
  causationId: uuid("causation_id"),
  bulkOperationId: uuid("bulk_operation_id"),
});

export const eventDeliveries = pgTable(
  "event_deliveries",
  {
    eventId: uuid("event_id").notNull(),
    consumer: text("consumer").notNull(),
    status: text("status").$type<"pending" | "done" | "failed" | "dead">().notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: ts("next_attempt_at").notNull().defaultNow(),
    lockedUntil: ts("locked_until"),
    lastError: text("last_error"),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.consumer] })],
);

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  occurredAt: ts("occurred_at").notNull(),
  actorType: text("actor_type").notNull(),
  actorId: uuid("actor_id"),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id").notNull(),
  before: jsonb("before").$type<Record<string, unknown> | null>(),
  after: jsonb("after").$type<Record<string, unknown> | null>(),
  ipHash: text("ip_hash"),
  requestId: text("request_id"),
  eventId: uuid("event_id").notNull(),
});

// ---------- people (PRD-03) and access (PRD-04) ----------
export type PrincipalType = "org" | "team" | "user";
export type AclLevel = "view" | "edit" | "manage";

export const invitations = pgTable(
  "invitations",
  {
    organizationId: uuid("organization_id").notNull(),
    id: uuid("id").notNull(),
    email: text("email").notNull(),
    role: text("role").$type<"admin" | "member">().notNull(),
    tokenHash: text("token_hash").notNull(),
    status: text("status").$type<"pending" | "accepted" | "revoked">().notNull().default("pending"),
    expiresAt: ts("expires_at").notNull(),
    invitedBy: uuid("invited_by").notNull(),
    acceptedBy: uuid("accepted_by"),
    acceptedAt: ts("accepted_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.id] })],
);

export const teams = pgTable(
  "teams",
  {
    organizationId: uuid("organization_id").notNull(),
    id: uuid("id").notNull(),
    name: text("name").notNull(),
    createdBy: uuid("created_by").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.id] })],
);

export const teamMembers = pgTable(
  "team_members",
  {
    organizationId: uuid("organization_id").notNull(),
    teamId: uuid("team_id").notNull(),
    userId: uuid("user_id").notNull(),
    addedAt: ts("added_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.teamId, t.userId] })],
);

export const appRegistry = pgTable("app_registry", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  position: integer("position").notNull(),
});

export const orgApps = pgTable(
  "org_apps",
  {
    organizationId: uuid("organization_id").notNull(),
    appId: text("app_id").notNull(),
    enabled: boolean("enabled").notNull(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.appId] })],
);

export const appGrants = pgTable(
  "app_grants",
  {
    organizationId: uuid("organization_id").notNull(),
    appId: text("app_id").notNull(),
    principalType: text("principal_type").$type<PrincipalType>().notNull(),
    principalId: uuid("principal_id").notNull(),
    createdBy: uuid("created_by"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.appId, t.principalType, t.principalId] })],
);

export const aclEntries = pgTable(
  "acl_entries",
  {
    organizationId: uuid("organization_id").notNull(),
    containerType: text("container_type").notNull(),
    containerId: uuid("container_id").notNull(),
    principalType: text("principal_type").$type<PrincipalType>().notNull(),
    principalId: uuid("principal_id").notNull(),
    level: text("level").$type<AclLevel>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.containerType, t.containerId, t.principalType, t.principalId] })],
);
