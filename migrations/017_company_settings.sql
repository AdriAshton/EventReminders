BEGIN;

CREATE TABLE IF NOT EXISTS company_settings (
    companyid INT PRIMARY KEY REFERENCES companies(companyid) ON DELETE CASCADE,
    emailprovider VARCHAR(20) NOT NULL DEFAULT 'mailtrap',
    reminderdelivery JSONB NOT NULL DEFAULT '{"sendTime":"09:00","channel":"Email"}'::jsonb,
    messagetemplates JSONB NOT NULL DEFAULT '{"activeTemplateId":"birthday-default","templates":[{"id":"birthday-default","name":"Default Birthday Template","subject":"Happy Birthday, {{clientName}}!","body":"Happy Birthday {{clientName}}!\n\nEveryone at {{companyName}} wishes you a wonderful day.\n\nBest wishes,","imageUrl":""}]}'::jsonb,
    createdat TIMESTAMP NOT NULL DEFAULT NOW(),
    updatedat TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_settings_emailprovider ON company_settings(emailprovider);

COMMIT;
