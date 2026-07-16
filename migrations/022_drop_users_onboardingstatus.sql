-- Remove obsolete users.onboardingstatus column.

BEGIN;

ALTER TABLE users
    DROP COLUMN IF EXISTS onboardingstatus;

COMMIT;
