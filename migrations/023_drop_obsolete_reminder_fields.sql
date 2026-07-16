-- Remove obsolete reminder scheduling fields now that birthday reminders are date-driven.

BEGIN;

ALTER TABLE reminders
    DROP COLUMN IF EXISTS reminderkind,
    DROP COLUMN IF EXISTS sendtime,
    DROP COLUMN IF EXISTS timingunit,
    DROP COLUMN IF EXISTS timingvalue,
    DROP COLUMN IF EXISTS timingtype;

COMMIT;