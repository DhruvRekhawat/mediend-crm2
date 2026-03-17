-- Rebuild sales Team records from DepartmentTeam in SURGERY SALES.
-- Uses Employee.managerId to find the sales head for each team lead.
--
-- Usage:
--   psql "$DATABASE_URL" -f scripts/db/rebuild-sales-teams.sql
--
-- Or via Docker:
--   docker compose --profile tools run --rm rebuild-sales-teams

BEGIN;

-- Step 1: Clear teamId on all users
UPDATE "User" SET "teamId" = NULL;

-- Step 2: Clear Target.teamId so we can delete Team (FK constraint)
UPDATE "Target" SET "teamId" = NULL WHERE "teamId" IS NOT NULL;

-- Step 3: Remove all existing sales Team records
DELETE FROM "Team";

-- Step 4: Create Team records from DepartmentTeam in SURGERY SALES
-- Uses the team lead's managerId to find the sales head above them
INSERT INTO "Team" (id, name, "salesHeadId", "teamLeadId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  dt.name,
  sh_user.id,        -- sales head's User.id
  tl_user.id,        -- team lead's User.id
  NOW(),
  NOW()
FROM "DepartmentTeam" dt
JOIN "Department" d       ON d.id = dt."departmentId"
JOIN "Employee" tl_emp    ON tl_emp.id = dt."teamLeadId"
JOIN "User" tl_user      ON tl_user.id = tl_emp."userId"
JOIN "Employee" sh_emp    ON sh_emp.id = tl_emp."managerId"
JOIN "User" sh_user      ON sh_user.id = sh_emp."userId"
WHERE UPPER(d.name) = 'SURGERY SALES'
  AND dt."teamLeadId" IS NOT NULL
  AND sh_user.role = 'SALES_HEAD';

-- Step 5: Assign BD members to their new Team via DepartmentTeam membership
UPDATE "User" u
SET "teamId" = t.id
FROM "Employee" bd_emp
JOIN "DepartmentTeam" dt ON dt.id = bd_emp."teamId"
JOIN "Department" d      ON d.id = dt."departmentId"
JOIN "Employee" tl_emp   ON tl_emp.id = dt."teamLeadId"
JOIN "Team" t            ON t."teamLeadId" = tl_emp."userId"
WHERE u.id = bd_emp."userId"
  AND UPPER(d.name) = 'SURGERY SALES';

COMMIT;
