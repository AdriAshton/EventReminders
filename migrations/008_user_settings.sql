-- Add a JSONB settings column to Users for storing per-user preferences
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Ensure updated_at timestamp remains useful
-- Only set default if a column for updated timestamp exists. Different schemas
-- may use "updatedat", "updated_at", or "updatedAt". Use a safe conditional
-- to avoid failing when the column name differs.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updatedat') THEN
    EXECUTE 'ALTER TABLE users ALTER COLUMN updatedat SET DEFAULT NOW()';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') THEN
    EXECUTE 'ALTER TABLE users ALTER COLUMN updated_at SET DEFAULT NOW()';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updatedat') THEN
    EXECUTE 'ALTER TABLE users ALTER COLUMN "updatedAt" SET DEFAULT NOW()';
  END IF;
END$$;
