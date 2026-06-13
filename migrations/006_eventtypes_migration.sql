-- Migration: 006_eventtypes_migration.sql
-- Up: create EventTypes, backfill from Events, add FK, drop EventType column
-- Down: restore EventType column, copy back names, drop FK and EventTypes

BEGIN;

-- create lookup table
CREATE TABLE IF NOT EXISTS EventTypes (
  EventTypeId SERIAL PRIMARY KEY,
  EventTypeName VARCHAR(50) NOT NULL UNIQUE,
  Description TEXT
);

-- populate lookup from existing Events (only if Events.EventType exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'eventtype'
  ) THEN
    INSERT INTO EventTypes (EventTypeName)
    SELECT DISTINCT EventType FROM Events
    WHERE EventType IS NOT NULL
    ON CONFLICT (EventTypeName) DO NOTHING;
  END IF;
END
$$;

-- add FK column to Events
ALTER TABLE Events ADD COLUMN IF NOT EXISTS EventTypeId INT;

-- backfill EventTypeId only if Events.EventType exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'eventtype'
  ) THEN
    UPDATE Events e
    SET EventTypeId = t.EventTypeId
    FROM EventTypes t
    WHERE e.EventType = t.EventTypeName;
  END IF;
END
$$;

-- set NOT NULL if every row is backfilled
-- (leave nullable during migration to be safe)

-- add FK constraint only if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.conname = 'fk_event_eventtype' AND t.relname = 'events'
  ) THEN
    ALTER TABLE Events
      ADD CONSTRAINT fk_event_eventtype
        FOREIGN KEY (EventTypeId) REFERENCES EventTypes(EventTypeId) ON DELETE RESTRICT;
  END IF;
END
$$;

-- drop old EventType column
ALTER TABLE Events DROP COLUMN IF EXISTS EventType;

-- index for fast lookup
CREATE INDEX IF NOT EXISTS idx_eventtypes_name ON EventTypes(EventTypeName);
CREATE INDEX IF NOT EXISTS idx_events_eventtypeid ON Events(EventTypeId);

COMMIT;

-- Down migration (manually run to rollback):
-- BEGIN;
-- ALTER TABLE Events ADD COLUMN IF NOT EXISTS EventType VARCHAR(50);
-- UPDATE Events e
-- SET EventType = t.EventTypeName
-- FROM EventTypes t
-- WHERE e.EventTypeId = t.EventTypeId;
-- ALTER TABLE Events DROP CONSTRAINT IF EXISTS fk_event_eventtype;
-- ALTER TABLE Events DROP COLUMN IF EXISTS EventTypeId;
-- DROP INDEX IF EXISTS idx_events_eventtypeid;
-- DROP INDEX IF EXISTS idx_eventtypes_name;
-- DROP TABLE IF EXISTS EventTypes;
-- COMMIT;
