-- Notifications (PRD-10 v1.4.1 §6): the in-app inbox (Desk › Kotak masuk) and the account-critical
-- email log. One item per (recipient, dedupe_key): the event id, or a digest key — so a retried
-- delivery never creates a second item (PRD-00b D5).

CREATE TABLE notifications (
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  id uuid NOT NULL,
  recipient_user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  dedupe_key text NOT NULL,
  event_id uuid,
  type text NOT NULL,
  actor_user_id uuid,
  -- Names and titles at the time of the event; the sentence is rendered in the reader's language.
  vars jsonb NOT NULL DEFAULT '{}',
  target_url text,
  -- Read-time authorization (§6): the container the reader must be able to view, if any.
  subject_type text,
  subject_id uuid,
  for_me boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  archived_at timestamptz,
  PRIMARY KEY (organization_id, id)
);
CREATE UNIQUE INDEX notifications_dedupe_key ON notifications (recipient_user_id, organization_id, dedupe_key);
CREATE INDEX notifications_inbox_idx ON notifications (recipient_user_id, organization_id, created_at DESC) WHERE archived_at IS NULL;
CREATE INDEX notifications_created_idx ON notifications (created_at);

-- Account-critical email is sent at most once per (dedupe key, address) (§5).
CREATE TABLE notification_emails (
  dedupe_key text NOT NULL,
  email text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dedupe_key, email)
);
