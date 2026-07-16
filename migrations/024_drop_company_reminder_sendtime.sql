ALTER TABLE company_settings
  ALTER COLUMN reminderdelivery DROP DEFAULT;

UPDATE company_settings
SET reminderdelivery = COALESCE(reminderdelivery, '{}'::jsonb) - 'sendTime';

ALTER TABLE company_settings
  ALTER COLUMN reminderdelivery SET DEFAULT '{"channel":"Email"}'::jsonb;
