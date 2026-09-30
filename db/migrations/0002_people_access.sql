-- People (PRD-03) and access (PRD-04): invitations, teams, app access and resource ACL.
-- organization_id is the first column of every key and index (TECH-01 §4).

CREATE TABLE invitations (
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  id uuid NOT NULL,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'member')),
  token_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  expires_at timestamptz NOT NULL,
  invited_by uuid NOT NULL REFERENCES users (id),
  accepted_by uuid REFERENCES users (id),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, id)
);
CREATE UNIQUE INDEX invitations_token_key ON invitations (token_hash);
-- One open invitation per address (PRD-03 §6.2: offer "Kirim ulang" instead of a duplicate).
CREATE UNIQUE INDEX invitations_pending_email_key ON invitations (organization_id, email) WHERE status = 'pending';

CREATE TABLE teams (
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  id uuid NOT NULL,
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, id)
);
CREATE UNIQUE INDEX teams_name_key ON teams (organization_id, lower(name));

CREATE TABLE team_members (
  organization_id uuid NOT NULL,
  team_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, team_id, user_id),
  FOREIGN KEY (organization_id, team_id) REFERENCES teams (organization_id, id) ON DELETE CASCADE
);
CREATE INDEX team_members_user_idx ON team_members (organization_id, user_id);

-- Application access (PRD-04 §6.5). Release 1 registers Space only.
CREATE TABLE app_registry (
  id text PRIMARY KEY,
  name text NOT NULL,
  position integer NOT NULL
);
INSERT INTO app_registry (id, name, position) VALUES ('space', 'Space', 1);

CREATE TABLE org_apps (
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  app_id text NOT NULL REFERENCES app_registry (id),
  enabled boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, app_id)
);

CREATE TABLE app_grants (
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  app_id text NOT NULL REFERENCES app_registry (id),
  principal_type text NOT NULL CHECK (principal_type IN ('org', 'team', 'user')),
  principal_id uuid NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, app_id, principal_type, principal_id)
);
CREATE INDEX app_grants_principal_idx ON app_grants (organization_id, principal_type, principal_id);

-- Resource ACL (PRD-04 §6.3): container → principal → level.
CREATE TABLE acl_entries (
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  container_type text NOT NULL,
  container_id uuid NOT NULL,
  principal_type text NOT NULL CHECK (principal_type IN ('org', 'team', 'user')),
  principal_id uuid NOT NULL,
  level text NOT NULL CHECK (level IN ('view', 'edit', 'manage')),
  PRIMARY KEY (organization_id, container_type, container_id, principal_type, principal_id)
);
CREATE INDEX acl_entries_principal_idx ON acl_entries (organization_id, principal_type, principal_id);

-- Existing organizations get Space enabled for every member, as new ones do (PRD-02 §6.3).
INSERT INTO org_apps (organization_id, app_id, enabled) SELECT id, 'space', true FROM organizations;
INSERT INTO app_grants (organization_id, app_id, principal_type, principal_id, created_by)
  SELECT id, 'space', 'org', id, created_by FROM organizations;
