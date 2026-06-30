-- Consolidated PostgreSQL script for client audit only.
-- Run after the core tables exist: Companies, Users, Clients.

BEGIN;

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
