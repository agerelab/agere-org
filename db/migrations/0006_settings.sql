-- Personal settings (PRD-12 v1.3) and account deletion (PRD-13 §6.3).

-- Jabatan on the member profile (D49), and when the avatar last changed (cache key for the image).
ALTER TABLE users ADD COLUMN title text;
ALTER TABLE users ADD COLUMN avatar_updated_at timestamptz;
-- Deletion: login stops at deleted_at; name, email, avatar and credentials are scrubbed later
-- (within 30 days, PRD-13 §6.3) and the row stays as a tombstone ("Pengguna terhapus").
ALTER TABLE users ADD COLUMN deleted_at timestamptz;
ALTER TABLE users ADD COLUMN scrubbed_at timestamptz;

-- Avatars (PNG, JPG or WebP; cropped to 256 px in the browser; at most 2 MB).
CREATE TABLE user_avatars (
  user_id uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('image/png', 'image/jpeg', 'image/webp')),
  bytes bytea NOT NULL,
  size integer NOT NULL CHECK (size > 0 AND size <= 2097152),
  updated_at timestamptz NOT NULL DEFAULT now()
);
