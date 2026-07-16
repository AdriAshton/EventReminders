BEGIN;

ALTER TABLE messages
  DROP COLUMN IF EXISTS attachmenturl,
  DROP COLUMN IF EXISTS attachmentfilename,
  DROP COLUMN IF EXISTS attachmentmimetype;

COMMIT;
