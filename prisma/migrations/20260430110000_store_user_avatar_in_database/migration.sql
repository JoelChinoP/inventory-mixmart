ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_data BYTEA,
  ADD COLUMN IF NOT EXISTS avatar_mime_type VARCHAR(80),
  ADD COLUMN IF NOT EXISTS avatar_updated_at TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'chk_users_avatar_size'
      AND n.nspname = current_schema()
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT chk_users_avatar_size
      CHECK (avatar_data IS NULL OR octet_length(avatar_data) <= 4194304);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'chk_users_avatar_payload'
      AND n.nspname = current_schema()
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT chk_users_avatar_payload
      CHECK (
        (avatar_data IS NULL AND avatar_mime_type IS NULL)
        OR (
          avatar_data IS NOT NULL
          AND avatar_mime_type IN ('image/jpeg', 'image/png', 'image/webp')
        )
      );
  END IF;
END
$$;
