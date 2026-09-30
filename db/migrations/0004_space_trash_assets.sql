-- Space M3b (PRD-06 §6.9, US-7, US-14, US-15; PRD-13 Sampah): who deleted what, and uploaded space icons.

ALTER TABLE spaces ADD COLUMN deleted_by uuid;
ALTER TABLE spaces ADD COLUMN icon_asset_id uuid;
ALTER TABLE projects ADD COLUMN deleted_by uuid;
ALTER TABLE tasks ADD COLUMN deleted_by uuid;

-- Sampah lists and the 30-day purge read only deleted rows.
CREATE INDEX spaces_trash_idx ON spaces (organization_id, deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX projects_trash_idx ON projects (organization_id, deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX tasks_trash_idx ON tasks (organization_id, deleted_at) WHERE deleted_at IS NOT NULL;

-- Small organization-owned files (space icons ≤ 1 MB, SVG sanitized before insert). Kept in Postgres
-- so local PGlite and production behave the same; served by /api/assets/{org}/{id}.
CREATE TABLE org_assets (
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('space_icon')),
  content_type text NOT NULL CHECK (content_type IN ('image/png', 'image/jpeg', 'image/webp', 'image/svg+xml')),
  bytes bytea NOT NULL,
  size integer NOT NULL CHECK (size > 0 AND size <= 1048576),
  created_by uuid NOT NULL REFERENCES users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, id)
);
