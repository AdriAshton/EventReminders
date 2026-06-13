-- Consolidated PostgreSQL script for audit tables and triggers
-- Run after the core tables exist: Companies, Users, Clients, Events, Reminders, Messages.

BEGIN;

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
    CONSTRAINT fk_message_audit_message
        FOREIGN KEY (MessageId) REFERENCES Messages(MessageId)
        ON DELETE CASCADE,
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
