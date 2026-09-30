-- Space (PRD-06 v2.2, TECH-01 §4): spaces → projects → boards → columns → tasks.
-- organization_id leads every key and index. order_key is a fractional index compared byte-wise.

CREATE TABLE spaces (
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  id uuid NOT NULL,
  name text NOT NULL,
  icon_key text NOT NULL DEFAULT 'layers',
  description text NOT NULL DEFAULT '',
  created_by uuid NOT NULL REFERENCES users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  PRIMARY KEY (organization_id, id)
);
CREATE UNIQUE INDEX spaces_name_key ON spaces (organization_id, lower(name)) WHERE deleted_at IS NULL;

CREATE TABLE projects (
  organization_id uuid NOT NULL,
  id uuid NOT NULL,
  space_id uuid NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  -- 'inherit': the space's access plus the project's own grants; 'restricted': own grants only (PRD-04 I1).
  access text NOT NULL DEFAULT 'inherit' CHECK (access IN ('inherit', 'restricted')),
  owner_user_id uuid REFERENCES users (id),
  target_date date,
  status text CHECK (status IN ('on_track', 'at_risk', 'off_track')),
  status_note text,
  status_updated_at timestamptz,
  status_updated_by uuid,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_by uuid NOT NULL REFERENCES users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1,
  PRIMARY KEY (organization_id, id),
  FOREIGN KEY (organization_id, space_id) REFERENCES spaces (organization_id, id)
);
CREATE INDEX projects_space_idx ON projects (organization_id, space_id) WHERE deleted_at IS NULL;

CREATE TABLE project_favorites (
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id, project_id),
  FOREIGN KEY (organization_id, project_id) REFERENCES projects (organization_id, id) ON DELETE CASCADE
);

CREATE TABLE boards (
  organization_id uuid NOT NULL,
  id uuid NOT NULL,
  project_id uuid NOT NULL,
  name text NOT NULL,
  order_key text COLLATE "C" NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, id),
  FOREIGN KEY (organization_id, project_id) REFERENCES projects (organization_id, id) ON DELETE CASCADE
);
CREATE INDEX boards_project_idx ON boards (organization_id, project_id, order_key);

-- "columns" in TECH-01; named board_columns to stay clear of the SQL keyword.
CREATE TABLE board_columns (
  organization_id uuid NOT NULL,
  id uuid NOT NULL,
  board_id uuid NOT NULL,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('todo', 'in_progress', 'done')),
  order_key text COLLATE "C" NOT NULL,
  PRIMARY KEY (organization_id, id),
  FOREIGN KEY (organization_id, board_id) REFERENCES boards (organization_id, id) ON DELETE CASCADE
);
CREATE INDEX board_columns_board_idx ON board_columns (organization_id, board_id, order_key);

CREATE TABLE tasks (
  organization_id uuid NOT NULL,
  id uuid NOT NULL,
  project_id uuid NOT NULL,
  board_id uuid NOT NULL,
  column_id uuid NOT NULL,
  parent_task_id uuid,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  assignee_type text CHECK (assignee_type IN ('user', 'team')),
  assignee_id uuid,
  due_date date,
  priority text CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  order_key text COLLATE "C" NOT NULL,
  version integer NOT NULL DEFAULT 1,
  created_by uuid NOT NULL REFERENCES users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  done_at timestamptz,
  PRIMARY KEY (organization_id, id),
  FOREIGN KEY (organization_id, project_id) REFERENCES projects (organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, column_id) REFERENCES board_columns (organization_id, id),
  CHECK ((assignee_type IS NULL) = (assignee_id IS NULL))
);
CREATE INDEX tasks_assignee_idx ON tasks (organization_id, assignee_id) WHERE deleted_at IS NULL;
CREATE INDEX tasks_column_order_idx ON tasks (organization_id, column_id, order_key);
CREATE INDEX tasks_due_idx ON tasks (organization_id, due_date) WHERE deleted_at IS NULL;
CREATE INDEX tasks_done_idx ON tasks (organization_id, project_id, assignee_id, done_at);

CREATE TABLE task_comments (
  organization_id uuid NOT NULL,
  id uuid NOT NULL,
  task_id uuid NOT NULL,
  author_id uuid NOT NULL REFERENCES users (id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, id),
  FOREIGN KEY (organization_id, task_id) REFERENCES tasks (organization_id, id) ON DELETE CASCADE
);
CREATE INDEX task_comments_task_idx ON task_comments (organization_id, task_id, created_at);
