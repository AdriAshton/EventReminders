BEGIN;

CREATE TABLE IF NOT EXISTS company_invites (
    inviteid SERIAL PRIMARY KEY,
    companyid INT NOT NULL REFERENCES companies(companyid) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    roleid INT NOT NULL REFERENCES roles(roleid),
    token VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending',
    invitedby INT REFERENCES users(userid),
    invitedat TIMESTAMP NOT NULL DEFAULT NOW(),
    acceptedat TIMESTAMP,
    expiresat TIMESTAMP NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS company_onboarding_profiles (
    profileid SERIAL PRIMARY KEY,
    companyid INT NOT NULL UNIQUE REFERENCES companies(companyid) ON DELETE CASCADE,
    companyname VARCHAR(255) NOT NULL,
    contactemail VARCHAR(255) NOT NULL,
    contactphone VARCHAR(50) NOT NULL,
    setupstatus VARCHAR(20) NOT NULL DEFAULT 'NotStarted',
    trialenabled BOOLEAN NOT NULL DEFAULT FALSE,
    reminderdefaults JSONB DEFAULT '{}'::jsonb,
    createdat TIMESTAMP NOT NULL DEFAULT NOW(),
    updatedat TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_invites_companyid ON company_invites(companyid);
CREATE INDEX IF NOT EXISTS idx_company_invites_email ON company_invites(email);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS inviteid INT REFERENCES company_invites(inviteid),
    ADD COLUMN IF NOT EXISTS onboardingstatus VARCHAR(20) NOT NULL DEFAULT 'Active';

COMMIT;