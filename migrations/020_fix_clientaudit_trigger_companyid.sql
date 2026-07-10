BEGIN;

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

DROP TRIGGER IF EXISTS trg_client_audit ON Clients;
CREATE TRIGGER trg_client_audit
AFTER INSERT OR UPDATE OR DELETE ON Clients
FOR EACH ROW EXECUTE FUNCTION log_client_changes();

COMMIT;
