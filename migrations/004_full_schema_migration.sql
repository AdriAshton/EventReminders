-- Combined PostgreSQL migration for the current project schema
-- Order:
-- 1) Roles + Users role migration
-- 2) Reminder control columns
-- 3) Audit tables
-- 4) Audit triggers

BEGIN;

-- =========================
-- Roles and Users
-- =========================

CREATE TABLE IF NOT EXISTS Roles (
    RoleId SERIAL PRIMARY KEY,
    RoleName VARCHAR(50) NOT NULL UNIQUE,
    Description TEXT
);

INSERT INTO Roles (RoleName, Description)
VALUES
    ('Administrator', 'Full access including setup/security and role management'),
    ('Staff', 'Can add clients, events, and edit day-to-day data but not setup/security')
ON CONFLICT (RoleName) DO UPDATE
SET Description = EXCLUDED.Description;

ALTER TABLE Users
    ADD COLUMN IF NOT EXISTS RoleId INT;

-- Backfill RoleId from existing Role text column if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        UPDATE Users u
        SET RoleId = r.RoleId
        FROM Roles r
        WHERE u.RoleId IS NULL
          AND (
                LOWER(COALESCE(u.Role, '')) = LOWER(r.RoleName)
                OR (LOWER(COALESCE(u.Role, '')) IN ('admin', 'administrator') AND r.RoleName = 'Administrator')
                OR (LOWER(COALESCE(u.Role, '')) IN ('staff', 'user') AND r.RoleName = 'Staff')
              );
    END IF;
END
$$;

UPDATE Users
SET RoleId = (SELECT RoleId FROM Roles WHERE RoleName = 'Staff' LIMIT 1)
WHERE RoleId IS NULL;

-- Add FK constraint only if it doesn't already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE c.conname = 'fk_users_role' AND t.relname = 'users'
    ) THEN
        ALTER TABLE Users
            ADD CONSTRAINT fk_users_role
                FOREIGN KEY (RoleId) REFERENCES Roles(RoleId);
    END IF;
END
$$;

ALTER TABLE Users
    ALTER COLUMN RoleId SET NOT NULL;

-- Drop old Role column if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        ALTER TABLE Users DROP COLUMN Role;
    END IF;
END
$$;

-- =========================
-- Reminder controls
-- =========================

ALTER TABLE Reminders
    ADD COLUMN IF NOT EXISTS TimingType VARCHAR(20) DEFAULT 'Before',
    ADD COLUMN IF NOT EXISTS TimingValue INT DEFAULT 1,
    ADD COLUMN IF NOT EXISTS TimingUnit VARCHAR(10) DEFAULT 'Days',
    ADD COLUMN IF NOT EXISTS SendTime TIME DEFAULT '09:00:00',
    ADD COLUMN IF NOT EXISTS IsActive BOOLEAN DEFAULT TRUE;

UPDATE Reminders
SET
    TimingType = COALESCE(TimingType, 'Before'),
    TimingValue = COALESCE(TimingValue, 1),
    TimingUnit = COALESCE(TimingUnit, 'Days'),
    SendTime = COALESCE(SendTime, '09:00:00'::time),
    IsActive = COALESCE(IsActive, TRUE);

-- Add timing type check constraint if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE c.conname = 'chk_reminder_timing_type' AND t.relname = 'reminders'
    ) THEN
        ALTER TABLE Reminders
            ADD CONSTRAINT chk_reminder_timing_type
                CHECK (TimingType IN ('Before', 'OnDay', 'After'));
    END IF;
END
$$;

-- Add timing unit check constraint if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE c.conname = 'chk_reminder_timing_unit' AND t.relname = 'reminders'
    ) THEN
        ALTER TABLE Reminders
            ADD CONSTRAINT chk_reminder_timing_unit
                CHECK (TimingUnit IN ('Days', 'Hours'));
    END IF;
END
$$;

-- =========================
-- Audit tables
-- =========================

CREATE TABLE IF NOT EXISTS ClientAudit (
    AuditId SERIAL PRIMARY KEY,
    ClientId INT NOT NULL,
    CompanyId INT NOT NULL,
    Action VARCHAR(50) NOT NULL,
    ChangedBy VARCHAR(100),
    ChangeDate TIMESTAMP DEFAULT NOW(),
    OldValue JSONB,
    NewValue JSONB,
    CONSTRAINT fk_client_audit_client
        FOREIGN KEY (ClientId) REFERENCES Clients(ClientId)
        ON DELETE CASCADE,
    CONSTRAINT fk_client_audit_company
        FOREIGN KEY (CompanyId) REFERENCES Companies(CompanyId)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS EventAudit (
    AuditId SERIAL PRIMARY KEY,
    EventId INT NOT NULL,
    CompanyId INT NOT NULL,
    Action VARCHAR(50) NOT NULL,
    ChangedBy VARCHAR(100),
    ChangeDate TIMESTAMP DEFAULT NOW(),
    OldValue JSONB,
    NewValue JSONB,
    CONSTRAINT fk_event_audit_event
        FOREIGN KEY (EventId) REFERENCES Events(EventId)
        ON DELETE CASCADE,
    CONSTRAINT fk_event_audit_company
        FOREIGN KEY (CompanyId) REFERENCES Companies(CompanyId)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ReminderAudit (
    AuditId SERIAL PRIMARY KEY,
    ReminderId INT NOT NULL,
    CompanyId INT NOT NULL,
    Action VARCHAR(50) NOT NULL,
    ChangedBy VARCHAR(100),
    ChangeDate TIMESTAMP DEFAULT NOW(),
    OldValue JSONB,
    NewValue JSONB,
    CONSTRAINT fk_reminder_audit_reminder
        FOREIGN KEY (ReminderId) REFERENCES Reminders(ReminderId)
        ON DELETE CASCADE,
    CONSTRAINT fk_reminder_audit_company
        FOREIGN KEY (CompanyId) REFERENCES Companies(CompanyId)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS CompanyAudit (
    AuditId SERIAL PRIMARY KEY,
    CompanyId INT NOT NULL,
    Action VARCHAR(50) NOT NULL,
    ChangedBy VARCHAR(100),
    ChangeDate TIMESTAMP DEFAULT NOW(),
    OldValue JSONB,
    NewValue JSONB,
    CONSTRAINT fk_company_audit_company
        FOREIGN KEY (CompanyId) REFERENCES Companies(CompanyId)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS UserAudit (
    AuditId SERIAL PRIMARY KEY,
    UserId INT NOT NULL,
    CompanyId INT NOT NULL,
    Action VARCHAR(50) NOT NULL,
    ChangedBy VARCHAR(100),
    ChangeDate TIMESTAMP DEFAULT NOW(),
    OldValue JSONB,
    NewValue JSONB,
    CONSTRAINT fk_user_audit_user
        FOREIGN KEY (UserId) REFERENCES Users(UserId)
        ON DELETE CASCADE,
    CONSTRAINT fk_user_audit_company
        FOREIGN KEY (CompanyId) REFERENCES Companies(CompanyId)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS MessageAudit (
    AuditId SERIAL PRIMARY KEY,
    MessageId INT NOT NULL,
    CompanyId INT NOT NULL,
    Action VARCHAR(50) NOT NULL,
    ChangedBy VARCHAR(100),
    ChangeDate TIMESTAMP DEFAULT NOW(),
    OldValue JSONB,
    NewValue JSONB,
    CONSTRAINT fk_message_audit_company
        FOREIGN KEY (CompanyId) REFERENCES Companies(CompanyId)
        ON DELETE CASCADE
);

-- =========================
-- Trigger functions
-- =========================

CREATE OR REPLACE FUNCTION log_client_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO ClientAudit(ClientId, CompanyId, Action, ChangedBy, NewValue)
        VALUES (NEW.ClientId, NEW.CompanyId, 'INSERT', current_user, row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO ClientAudit(ClientId, CompanyId, Action, ChangedBy, OldValue, NewValue)
        VALUES (NEW.ClientId, NEW.CompanyId, 'UPDATE', current_user, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO ClientAudit(ClientId, CompanyId, Action, ChangedBy, OldValue)
        VALUES (OLD.ClientId, OLD.CompanyId, 'DELETE', current_user, row_to_json(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION log_event_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO EventAudit(EventId, CompanyId, Action, ChangedBy, NewValue)
        VALUES (NEW.EventId, NEW.CompanyId, 'INSERT', current_user, row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO EventAudit(EventId, CompanyId, Action, ChangedBy, OldValue, NewValue)
        VALUES (NEW.EventId, NEW.CompanyId, 'UPDATE', current_user, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO EventAudit(EventId, CompanyId, Action, ChangedBy, OldValue)
        VALUES (OLD.EventId, OLD.CompanyId, 'DELETE', current_user, row_to_json(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION log_reminder_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO ReminderAudit(ReminderId, CompanyId, Action, ChangedBy, NewValue)
        VALUES (NEW.ReminderId, NEW.CompanyId, 'INSERT', current_user, row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO ReminderAudit(ReminderId, CompanyId, Action, ChangedBy, OldValue, NewValue)
        VALUES (NEW.ReminderId, NEW.CompanyId, 'UPDATE', current_user, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO ReminderAudit(ReminderId, CompanyId, Action, ChangedBy, OldValue)
        VALUES (OLD.ReminderId, OLD.CompanyId, 'DELETE', current_user, row_to_json(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION log_company_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO CompanyAudit(CompanyId, Action, ChangedBy, NewValue)
        VALUES (NEW.CompanyId, 'INSERT', current_user, row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO CompanyAudit(CompanyId, Action, ChangedBy, OldValue, NewValue)
        VALUES (NEW.CompanyId, 'UPDATE', current_user, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO CompanyAudit(CompanyId, Action, ChangedBy, OldValue)
        VALUES (OLD.CompanyId, 'DELETE', current_user, row_to_json(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION log_user_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO UserAudit(UserId, CompanyId, Action, ChangedBy, NewValue)
        VALUES (NEW.UserId, NEW.CompanyId, 'INSERT', current_user, row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO UserAudit(UserId, CompanyId, Action, ChangedBy, OldValue, NewValue)
        VALUES (NEW.UserId, NEW.CompanyId, 'UPDATE', current_user, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO UserAudit(UserId, CompanyId, Action, ChangedBy, OldValue)
        VALUES (OLD.UserId, OLD.CompanyId, 'DELETE', current_user, row_to_json(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION log_message_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO MessageAudit(MessageId, CompanyId, Action, ChangedBy, NewValue)
        VALUES (NEW.MessageId, NEW.CompanyId, 'INSERT', current_user, row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO MessageAudit(MessageId, CompanyId, Action, ChangedBy, OldValue, NewValue)
        VALUES (NEW.MessageId, NEW.CompanyId, 'UPDATE', current_user, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO MessageAudit(MessageId, CompanyId, Action, ChangedBy, OldValue)
        VALUES (OLD.MessageId, OLD.CompanyId, 'DELETE', current_user, row_to_json(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =========================
-- Triggers
-- =========================

DROP TRIGGER IF EXISTS trg_client_audit ON Clients;
CREATE TRIGGER trg_client_audit
AFTER INSERT OR UPDATE OR DELETE ON Clients
FOR EACH ROW EXECUTE FUNCTION log_client_changes();

DROP TRIGGER IF EXISTS trg_event_audit ON Events;
CREATE TRIGGER trg_event_audit
AFTER INSERT OR UPDATE OR DELETE ON Events
FOR EACH ROW EXECUTE FUNCTION log_event_changes();

DROP TRIGGER IF EXISTS trg_reminder_audit ON Reminders;
CREATE TRIGGER trg_reminder_audit
AFTER INSERT OR UPDATE OR DELETE ON Reminders
FOR EACH ROW EXECUTE FUNCTION log_reminder_changes();

DROP TRIGGER IF EXISTS trg_company_audit ON Companies;
CREATE TRIGGER trg_company_audit
AFTER INSERT OR UPDATE OR DELETE ON Companies
FOR EACH ROW EXECUTE FUNCTION log_company_changes();

DROP TRIGGER IF EXISTS trg_user_audit ON Users;
CREATE TRIGGER trg_user_audit
AFTER INSERT OR UPDATE OR DELETE ON Users
FOR EACH ROW EXECUTE FUNCTION log_user_changes();

DROP TRIGGER IF EXISTS trg_message_audit ON Messages;
CREATE TRIGGER trg_message_audit
AFTER INSERT OR UPDATE OR DELETE ON Messages
FOR EACH ROW EXECUTE FUNCTION log_message_changes();

COMMIT;
