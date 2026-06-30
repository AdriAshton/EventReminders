-- One-time cleanup script
-- Drop reminder constraints that referenced removed timing fields.

BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE c.conname = 'chk_reminder_timing_type' AND t.relname = 'reminders'
    ) THEN
        ALTER TABLE Reminders DROP CONSTRAINT chk_reminder_timing_type;
    END IF;
END
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE c.conname = 'chk_reminder_timing_unit' AND t.relname = 'reminders'
    ) THEN
        ALTER TABLE Reminders DROP CONSTRAINT chk_reminder_timing_unit;
    END IF;
END
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE c.conname = 'chk_reminder_recurrence_type' AND t.relname = 'reminders'
    ) THEN
        ALTER TABLE Reminders DROP CONSTRAINT chk_reminder_recurrence_type;
    END IF;
END
$$;

COMMIT;
