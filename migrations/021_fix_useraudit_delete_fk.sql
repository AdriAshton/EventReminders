BEGIN;

ALTER TABLE IF EXISTS useraudit
    DROP CONSTRAINT IF EXISTS fk_user;

CREATE OR REPLACE FUNCTION log_user_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO useraudit(userid, companyid, action, changedby, newvalue)
        VALUES (NEW.userid, NEW.companyid, 'INSERT', current_user, row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO useraudit(userid, companyid, action, changedby, oldvalue, newvalue)
        VALUES (NEW.userid, NEW.companyid, 'UPDATE', current_user, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO useraudit(userid, companyid, action, changedby, oldvalue)
        VALUES (OLD.userid, OLD.companyid, 'DELETE', current_user, row_to_json(OLD));
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_audit ON users;
CREATE TRIGGER trg_user_audit
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION log_user_changes();

COMMIT;