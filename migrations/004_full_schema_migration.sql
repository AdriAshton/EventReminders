-- Combined PostgreSQL migration for the current project schema
-- Order:
-- 1) Roles + Users role migration
-- 2) Reminder control columns
-- 3) Client audit table
-- 4) Client audit trigger
-- 5) Reminder constraint cleanup is handled separately in 012_drop_reminder_constraints.sql for existing databases

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
    ('Staff', 'Can add clients and edit day-to-day data but not setup/security')
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
    ADD COLUMN IF NOT EXISTS SendTime TIME DEFAULT '09:00:00',
    ADD COLUMN IF NOT EXISTS IsActive BOOLEAN DEFAULT TRUE;

UPDATE Reminders
SET
    SendTime = COALESCE(SendTime, '09:00:00'::time),
    IsActive = COALESCE(IsActive, TRUE);

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

-- =========================
-- Audit tables
-- =========================

CREATE TABLE IF NOT EXISTS ClientAudit (
    AuditId SERIAL PRIMARY KEY,
    ClientId INT NOT NULL,
    Action VARCHAR(50) NOT NULL,
    ChangedBy VARCHAR(100),
    ChangeDate TIMESTAMP DEFAULT NOW(),
    OldValue JSONB,
    NewValue JSONB,
    CONSTRAINT fk_client_audit_client
        FOREIGN KEY (ClientId) REFERENCES Clients(ClientId)
        ON DELETE CASCADE
);

-- =========================
-- Trigger functions
-- =========================

CREATE OR REPLACE FUNCTION log_client_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO ClientAudit(ClientId, Action, ChangedBy, NewValue)
        VALUES (NEW.ClientId, 'INSERT', current_user, row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO ClientAudit(ClientId, Action, ChangedBy, OldValue, NewValue)
        VALUES (NEW.ClientId, 'UPDATE', current_user, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO ClientAudit(ClientId, Action, ChangedBy, OldValue)
        VALUES (OLD.ClientId, 'DELETE', current_user, row_to_json(OLD));
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

COMMIT;
