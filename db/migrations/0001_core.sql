-- Release 1 core (TECH-01 §4): identity (PRD-01), organization and membership (PRD-02/03),
-- event outbox and audit (PRD-00b, PRD-11). Every organization-scoped index starts with
-- organization_id. Ids are UUIDv7.

-- ---------- identity (PRD-01) — the only tables with readable PII (PRD-13 §5) ----------
CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  name text NOT NULL,
  email_verified_at timestamptz,
  locale text CHECK (locale IN ('en', 'id')),
  timezone text,
  theme text NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
  last_organization_id uuid,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_key ON users (lower(email));

CREATE TABLE credentials (
  user_id uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- The cookie holds a random token; only its SHA-256 is stored, so a database leak yields no sessions.
CREATE TABLE sessions (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_auth_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  user_agent text,
  ip_hash text
);
CREATE INDEX sessions_user_idx ON sessions (user_id);

CREATE TABLE verification_tokens (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('verify_email', 'reset_password')),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX verification_tokens_user_idx ON verification_tokens (user_id, purpose);

-- Abuse protection (PRD-01 §6.6): hits per key in a window, and lockouts.
CREATE TABLE rate_limit_hits (
  key text NOT NULL,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rate_limit_hits_key_idx ON rate_limit_hits (key, at);

CREATE TABLE rate_limits (
  key text PRIMARY KEY,
  locked_until timestamptz NOT NULL
);

CREATE TABLE consents (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('terms', 'privacy')),
  version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_hash text
);
CREATE INDEX consents_user_idx ON consents (user_id);

-- ---------- organization (PRD-02) and membership (PRD-03) ----------
CREATE TABLE organizations (
  id uuid PRIMARY KEY,
  slug text NOT NULL,
  name text NOT NULL,
  legal_name text,
  default_locale text NOT NULL DEFAULT 'en' CHECK (default_locale IN ('en', 'id')),
  timezone text NOT NULL DEFAULT 'Asia/Jakarta',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending_deletion')),
  created_by uuid NOT NULL REFERENCES users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX organizations_slug_key ON organizations (slug);

CREATE TABLE memberships (
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz,
  PRIMARY KEY (organization_id, user_id)
);
CREATE INDEX memberships_user_idx ON memberships (user_id);

-- ---------- events (PRD-00b) and audit (PRD-11) ----------
CREATE TABLE outbox_events (
  seq bigserial PRIMARY KEY,
  event_id uuid NOT NULL UNIQUE,
  type text NOT NULL,
  version integer NOT NULL,
  scope text NOT NULL CHECK (scope IN ('organization', 'user')),
  organization_id uuid,
  occurred_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  producer jsonb NOT NULL,
  actor jsonb NOT NULL,
  subject jsonb NOT NULL,
  data jsonb NOT NULL,
  audit boolean NOT NULL,
  pii jsonb NOT NULL DEFAULT '[]',
  request_id text,
  causation_id uuid,
  bulk_operation_id uuid,
  CHECK ((scope = 'organization') = (organization_id IS NOT NULL))
);
CREATE INDEX outbox_events_org_idx ON outbox_events (organization_id, seq);

CREATE TABLE event_deliveries (
  event_id uuid NOT NULL REFERENCES outbox_events (event_id) ON DELETE CASCADE,
  consumer text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'failed', 'dead')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  last_error text,
  PRIMARY KEY (event_id, consumer)
);
CREATE INDEX event_deliveries_due_idx ON event_deliveries (status, next_attempt_at);

-- Append-only; written in the same transaction as the mutation (PRD-00b D2).
CREATE TABLE audit_log (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  occurred_at timestamptz NOT NULL,
  actor_type text NOT NULL,
  actor_id uuid,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  before jsonb,
  after jsonb,
  ip_hash text,
  request_id text,
  event_id uuid NOT NULL
);
CREATE INDEX audit_log_org_time_idx ON audit_log (organization_id, occurred_at DESC);

-- PRD-11 US-4: application code can never change or delete audit rows. Only the retention purge
-- (PRD-13) may delete, by setting agere.purge = 'on' in its own transaction.
CREATE FUNCTION audit_log_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('agere.purge', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$;
CREATE TRIGGER audit_log_immutable BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
