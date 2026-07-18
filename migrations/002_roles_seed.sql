-- PostgreSQL seed data for roles
-- Run after the Roles table has been created.

INSERT INTO Roles (RoleName, Description)
VALUES
    ('Administrator', 'Full access including setup/security and role management'),
    ('Owner', 'Can manage the tenant, company settings, and all setup/security'),
    ('Staff', 'Can add clients and edit day-to-day data but not setup/security')
ON CONFLICT (RoleName) DO UPDATE
SET Description = EXCLUDED.Description;

UPDATE Users
SET RoleId = (
    SELECT RoleId
    FROM Roles
    WHERE RoleName = 'Owner'
    LIMIT 1
)
WHERE LOWER(username) = 'adrian'
   OR LOWER(email) IN ('adrian.ashton@example.com', 'adrian.q.ashton@gmail.com');
