-- Optional: correct createdDate on existing leads using leadEntryDate where Lead_Date was wrong.
-- Use only when you are NOT doing a full re-import (e.g. one-off correction).
--
-- This sets createdDate = leadEntryDate for rows where leadEntryDate is not null.
-- Run only if you have verified that leadEntryDate is the correct "received" date for those rows.
--
-- Usage (example with psql):
--   psql $DATABASE_URL -f scripts/db/update-created-date-from-lead-entry.sql

BEGIN;

UPDATE "Lead"
SET "createdDate" = "leadEntryDate"
WHERE "leadEntryDate" IS NOT NULL
  AND "leadEntryDate" IS DISTINCT FROM "createdDate";

COMMIT;
