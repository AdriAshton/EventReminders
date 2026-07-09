-- Disable the legacy company audit trigger that can block company deletes
-- when the audit table FK chain is inconsistent with the current schema.

BEGIN;

DROP TRIGGER IF EXISTS trg_company_audit ON companies;
DROP FUNCTION IF EXISTS log_company_changes();

COMMIT;