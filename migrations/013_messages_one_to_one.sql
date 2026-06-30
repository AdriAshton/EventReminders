-- One-time cleanup and enforcement for the one-to-one reminder/message relationship

BEGIN;

-- Keep the newest message per reminder and delete older duplicates.
WITH ranked_messages AS (
    SELECT
        messageid,
        reminderid,
        ROW_NUMBER() OVER (PARTITION BY reminderid ORDER BY messageid DESC) AS row_num
    FROM messages
)
DELETE FROM messages
WHERE messageid IN (
    SELECT messageid
    FROM ranked_messages
    WHERE row_num > 1
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE c.conname = 'uq_messages_reminderid' AND t.relname = 'messages'
    ) THEN
        ALTER TABLE messages
            ADD CONSTRAINT uq_messages_reminderid UNIQUE (reminderid);
    END IF;
END
$$;

COMMIT;