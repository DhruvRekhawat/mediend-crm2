-- Truncate leads and related data for a full re-import from MySQL.
-- Run this against your PostgreSQL database (e.g. via psql or Prisma db execute).
--
-- Order matters:
-- 1. LeadRemark has no FK to Lead (it stores leadRef = MySQL lead.id), so truncate first.
-- 2. Lead: CASCADE will remove LeadStageEvent and other tables that reference Lead.id.
-- 3. SyncState: reset so the next sync pulls all leads from MySQL (from Lead_Date >= your chosen date).
--
-- Usage (example with psql):
--   psql $DATABASE_URL -f scripts/db/truncate-leads-for-reimport.sql
--
-- Or run the statements manually in your DB client.

BEGIN;

-- Remove all lead remarks (keyed by MySQL lead id, not Lead.id)
TRUNCATE TABLE "LeadRemark";

-- Remove all leads; CASCADE will remove LeadStageEvent and other dependent rows
TRUNCATE TABLE "Lead" CASCADE;

-- Reset sync state so next incremental sync treats all MySQL leads as new
-- (adjust sourceType if you use a different value)
DELETE FROM "SyncState" WHERE "sourceType" = 'mysql_leads';

COMMIT;
