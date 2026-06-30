-- PostgreSQL migration: create Roles and migrate Users.Role -> Users.RoleId
-- Run this after the base Companies table exists.

BEGIN;

CREATE TABLE IF NOT EXISTS Roles (
    RoleId SERIAL PRIMARY KEY,
    RoleName VARCHAR(50) NOT NULL UNIQUE,
    Description TEXT
);

INSERT INTO Roles (RoleName, Description)
VALUES
    ('Administrator', 'Full access including setup/security and role management'),
    ('Staff', 'Can add clients and edit day-to-day data but not setup/security')
ON CONFLICT (RoleName) DO NOTHING;

ALTER TABLE Users
    ADD COLUMN IF NOT EXISTS RoleId INT;

-- Backfill RoleId from the old Role text column before removing it.
DO $$
BEGIN
        IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'role'
        ) THEN
                UPDATE Users u
                SET RoleId = r.RoleId
                FROM Roles r
                WHERE u.RoleId IS NULL
                    AND (
                                LOWER(COALESCE(u.Role, '')) = LOWER(r.RoleName)
                                OR (LOWER(COALESCE(u.Role, '')) IN ('admin', 'administrator') AND r.RoleName = 'Administrator')
                                OR (LOWER(COALESCE(u.Role, '')) IN ('staff', 'user') AND r.RoleName = 'Staff')
                            );
        END IF;
END
$$;

-- Default any remaining users to Staff.
UPDATE Users
SET RoleId = (SELECT RoleId FROM Roles WHERE RoleName = 'Staff' LIMIT 1)
WHERE RoleId IS NULL;

-- Add FK constraint only if it doesn't already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE c.conname = 'fk_users_role' AND t.relname = 'users'
    ) THEN
        ALTER TABLE Users
            ADD CONSTRAINT fk_users_role
                FOREIGN KEY (RoleId) REFERENCES Roles(RoleId);
    END IF;
END
$$;

ALTER TABLE Users
    ALTER COLUMN RoleId SET NOT NULL;

-- Drop old Role column if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        ALTER TABLE Users DROP COLUMN Role;
    END IF;
END
$$;

COMMIT;
