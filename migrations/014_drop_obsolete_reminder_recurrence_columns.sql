-- Remove obsolete recurrence columns now that birthday reminders are implicitly yearly.

BEGIN;

ALTER TABLE Reminders
    DROP COLUMN IF EXISTS IsRecurring,
    DROP COLUMN IF EXISTS RecurrenceType,
    DROP COLUMN IF EXISTS RecurrenceInterval;

COMMIT;