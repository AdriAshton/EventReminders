-- Migration: 007_eventtypes_companyid.sql
-- Add CompanyId to EventTypes to allow company-scoped event types

BEGIN;

ALTER TABLE EventTypes
  ADD COLUMN IF NOT EXISTS CompanyId INT;

-- Add FK to Companies (nullable)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.conname = 'fk_eventtypes_company' AND t.relname = 'eventtypes'
  ) THEN
    ALTER TABLE EventTypes
      ADD CONSTRAINT fk_eventtypes_company
        FOREIGN KEY (CompanyId) REFERENCES Companies(CompanyId) ON DELETE SET NULL;
  END IF;
END
$$;

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_eventtypes_companyid ON EventTypes(CompanyId);

COMMIT;

-- Down (manual):
-- BEGIN; ALTER TABLE EventTypes DROP CONSTRAINT IF EXISTS fk_eventtypes_company; ALTER TABLE EventTypes DROP COLUMN IF EXISTS CompanyId; DROP INDEX IF EXISTS idx_eventtypes_companyid; COMMIT;
