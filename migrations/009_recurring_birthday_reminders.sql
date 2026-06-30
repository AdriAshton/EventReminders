-- Migration: 009_recurring_birthday_reminders.sql
-- Add yearly run scheduling support for birthday reminders

BEGIN;

ALTER TABLE Reminders
    ADD COLUMN IF NOT EXISTS IsRecurring BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS RecurrenceType VARCHAR(20),
    ADD COLUMN IF NOT EXISTS RecurrenceInterval INT DEFAULT 1,
    ADD COLUMN IF NOT EXISTS NextRunAt TIMESTAMP,
    ADD COLUMN IF NOT EXISTS LastSentAt TIMESTAMP;

UPDATE Reminders
SET
    IsRecurring = COALESCE(IsRecurring, FALSE),
    RecurrenceInterval = COALESCE(RecurrenceInterval, 1)
WHERE IsRecurring IS NULL OR RecurrenceInterval IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE c.conname = 'chk_reminder_recurrence_type' AND t.relname = 'reminders'
    ) THEN
        ALTER TABLE Reminders
            ADD CONSTRAINT chk_reminder_recurrence_type
                CHECK (RecurrenceType IS NULL OR RecurrenceType IN ('yearly'));
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_reminders_next_run_at ON Reminders(NextRunAt);
CREATE INDEX IF NOT EXISTS idx_reminders_isrecurring ON Reminders(IsRecurring);

COMMIT;