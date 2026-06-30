-- PostgreSQL seed data for roles
-- Run after the Roles table has been created.

INSERT INTO Roles (RoleName, Description)
VALUES
    ('Administrator', 'Full access including setup/security and role management'),
    ('Staff', 'Can add clients and edit day-to-day data but not setup/security')
ON CONFLICT (RoleName) DO UPDATE
SET Description = EXCLUDED.Description;
