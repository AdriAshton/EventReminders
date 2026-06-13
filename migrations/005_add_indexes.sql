-- Migration: 005_add_indexes.sql
-- Add indexes to improve lookup and join performance

BEGIN;

-- Indexes for foreign keys and common joins
CREATE INDEX IF NOT EXISTS idx_clients_companyid ON Clients(CompanyId);
CREATE INDEX IF NOT EXISTS idx_events_clientid ON Events(ClientId);
CREATE INDEX IF NOT EXISTS idx_events_companyid ON Events(CompanyId);
CREATE INDEX IF NOT EXISTS idx_reminders_eventid ON Reminders(EventId);
CREATE INDEX IF NOT EXISTS idx_reminders_companyid ON Reminders(CompanyId);
CREATE INDEX IF NOT EXISTS idx_messages_reminderid ON Messages(ReminderId);
CREATE INDEX IF NOT EXISTS idx_messages_companyid ON Messages(CompanyId);
CREATE INDEX IF NOT EXISTS idx_users_companyid ON Users(CompanyId);
CREATE INDEX IF NOT EXISTS idx_users_roleid ON Users(RoleId);

-- Indexes for date/time and status queries
CREATE INDEX IF NOT EXISTS idx_events_eventdate ON Events(EventDate);
CREATE INDEX IF NOT EXISTS idx_reminders_datetime_status ON Reminders(ReminderDateTime, Status);
CREATE INDEX IF NOT EXISTS idx_messages_status_sentat ON Messages(Status, SentAt);

-- Index for EventTypeId (added by event types migration)
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_name = 'events' AND column_name = 'eventtypeid'
	) THEN
		EXECUTE 'CREATE INDEX IF NOT EXISTS idx_events_eventtypeid ON Events(EventTypeId)';
	END IF;
END
$$;

-- Optional: text lookup indexes (uncomment if used frequently)
-- CREATE INDEX IF NOT EXISTS idx_clients_email ON Clients(Email);
-- CREATE INDEX IF NOT EXISTS idx_users_email ON Users(Email);

COMMIT;

-- Down / rollback: drop the indexes
-- To rollback, run the DROP INDEX statements below (example):
-- DROP INDEX IF EXISTS idx_clients_companyid;
-- DROP INDEX IF EXISTS idx_events_clientid;
-- DROP INDEX IF EXISTS idx_events_companyid;
-- DROP INDEX IF EXISTS idx_reminders_eventid;
-- DROP INDEX IF EXISTS idx_reminders_companyid;
-- DROP INDEX IF EXISTS idx_messages_reminderid;
-- DROP INDEX IF EXISTS idx_messages_companyid;
-- DROP INDEX IF EXISTS idx_users_companyid;
-- DROP INDEX IF EXISTS idx_users_roleid;
-- DROP INDEX IF EXISTS idx_events_eventdate;
-- DROP INDEX IF EXISTS idx_reminders_datetime_status;
-- DROP INDEX IF EXISTS idx_messages_status_sentat;
