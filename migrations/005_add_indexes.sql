-- Migration: 005_add_indexes.sql
-- Add indexes to improve lookup and join performance

BEGIN;

-- Indexes for foreign keys and common joins
CREATE INDEX IF NOT EXISTS idx_messages_reminderid ON Messages(ReminderId);
CREATE INDEX IF NOT EXISTS idx_users_roleid ON Users(RoleId);

-- Indexes for date/time and status queries
CREATE INDEX IF NOT EXISTS idx_reminders_datetime_status ON Reminders(ReminderDateTime, Status);
CREATE INDEX IF NOT EXISTS idx_messages_status_sentat ON Messages(Status, SentAt);

-- Optional: text lookup indexes (uncomment if used frequently)
-- CREATE INDEX IF NOT EXISTS idx_clients_email ON Clients(Email);
-- CREATE INDEX IF NOT EXISTS idx_users_email ON Users(Email);

COMMIT;

-- Down / rollback: drop the indexes
-- To rollback, run the DROP INDEX statements below (example):
-- DROP INDEX IF EXISTS idx_messages_reminderid;
-- DROP INDEX IF EXISTS idx_users_roleid;
-- DROP INDEX IF EXISTS idx_reminders_datetime_status;
-- DROP INDEX IF EXISTS idx_messages_status_sentat;
