-- Generated from prisma/leaves.json
-- Current balance import from CARRY_FORRWARD_AFTER_ADJ_IN_FEB
-- This sets allocated = remaining = imported balance, and used = 0
-- Review before running.

BEGIN;

-- B.ASHWANI [2405]
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2405-CL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'CL' OR lt.name = 'CL')
WHERE e."employeeCode" = '2405'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2405-SL',
  e.id,
  lt.id,
  1.0::double precision,
  0::double precision,
  1.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'SL' OR lt.name = 'SL')
WHERE e."employeeCode" = '2405'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2405-EL',
  e.id,
  lt.id,
  3.0::double precision,
  0::double precision,
  3.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'EL' OR lt.name = 'EL')
WHERE e."employeeCode" = '2405'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();

-- HUMA [2404]
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2404-CL',
  e.id,
  lt.id,
  2.5::double precision,
  0::double precision,
  2.5::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'CL' OR lt.name = 'CL')
WHERE e."employeeCode" = '2404'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2404-SL',
  e.id,
  lt.id,
  6.0::double precision,
  0::double precision,
  6.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'SL' OR lt.name = 'SL')
WHERE e."employeeCode" = '2404'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2404-EL',
  e.id,
  lt.id,
  6.5::double precision,
  0::double precision,
  6.5::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'EL' OR lt.name = 'EL')
WHERE e."employeeCode" = '2404'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();

-- MAYANK [2480]
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2480-CL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'CL' OR lt.name = 'CL')
WHERE e."employeeCode" = '2480'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2480-SL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'SL' OR lt.name = 'SL')
WHERE e."employeeCode" = '2480'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2480-EL',
  e.id,
  lt.id,
  3.0::double precision,
  0::double precision,
  3.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'EL' OR lt.name = 'EL')
WHERE e."employeeCode" = '2480'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();

-- Amir Saifi [2038]
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2038-CL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'CL' OR lt.name = 'CL')
WHERE e."employeeCode" = '2038'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2038-SL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'SL' OR lt.name = 'SL')
WHERE e."employeeCode" = '2038'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2038-EL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'EL' OR lt.name = 'EL')
WHERE e."employeeCode" = '2038'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();

-- Abhishek Kashyap [2434]
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2434-CL',
  e.id,
  lt.id,
  2.0::double precision,
  0::double precision,
  2.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'CL' OR lt.name = 'CL')
WHERE e."employeeCode" = '2434'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2434-SL',
  e.id,
  lt.id,
  5.5::double precision,
  0::double precision,
  5.5::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'SL' OR lt.name = 'SL')
WHERE e."employeeCode" = '2434'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2434-EL',
  e.id,
  lt.id,
  5.5::double precision,
  0::double precision,
  5.5::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'EL' OR lt.name = 'EL')
WHERE e."employeeCode" = '2434'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();

-- Amit Shukla [2371]
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2371-CL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'CL' OR lt.name = 'CL')
WHERE e."employeeCode" = '2371'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2371-SL',
  e.id,
  lt.id,
  3.0::double precision,
  0::double precision,
  3.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'SL' OR lt.name = 'SL')
WHERE e."employeeCode" = '2371'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2371-EL',
  e.id,
  lt.id,
  7.0::double precision,
  0::double precision,
  7.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'EL' OR lt.name = 'EL')
WHERE e."employeeCode" = '2371'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();

-- Pankaj Pal [2484]
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2484-CL',
  e.id,
  lt.id,
  0.5::double precision,
  0::double precision,
  0.5::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'CL' OR lt.name = 'CL')
WHERE e."employeeCode" = '2484'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2484-SL',
  e.id,
  lt.id,
  3.5::double precision,
  0::double precision,
  3.5::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'SL' OR lt.name = 'SL')
WHERE e."employeeCode" = '2484'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2484-EL',
  e.id,
  lt.id,
  3.5::double precision,
  0::double precision,
  3.5::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'EL' OR lt.name = 'EL')
WHERE e."employeeCode" = '2484'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();

-- Avnish Thakur [2436]
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2436-CL',
  e.id,
  lt.id,
  4.0::double precision,
  0::double precision,
  4.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'CL' OR lt.name = 'CL')
WHERE e."employeeCode" = '2436'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2436-SL',
  e.id,
  lt.id,
  4.0::double precision,
  0::double precision,
  4.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'SL' OR lt.name = 'SL')
WHERE e."employeeCode" = '2436'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2436-EL',
  e.id,
  lt.id,
  6.0::double precision,
  0::double precision,
  6.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'EL' OR lt.name = 'EL')
WHERE e."employeeCode" = '2436'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();

-- Mohit Raghav [2046]
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2046-CL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'CL' OR lt.name = 'CL')
WHERE e."employeeCode" = '2046'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2046-SL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'SL' OR lt.name = 'SL')
WHERE e."employeeCode" = '2046'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2046-EL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'EL' OR lt.name = 'EL')
WHERE e."employeeCode" = '2046'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();

-- Hardeep Bhargav [2047]
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2047-CL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'CL' OR lt.name = 'CL')
WHERE e."employeeCode" = '2047'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2047-SL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'SL' OR lt.name = 'SL')
WHERE e."employeeCode" = '2047'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2047-EL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'EL' OR lt.name = 'EL')
WHERE e."employeeCode" = '2047'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();

-- Shivam Rohilla [2349]
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2349-CL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'CL' OR lt.name = 'CL')
WHERE e."employeeCode" = '2349'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2349-SL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'SL' OR lt.name = 'SL')
WHERE e."employeeCode" = '2349'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2349-EL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'EL' OR lt.name = 'EL')
WHERE e."employeeCode" = '2349'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();

-- Vishal Sharma-TPA [2503]
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2503-CL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'CL' OR lt.name = 'CL')
WHERE e."employeeCode" = '2503'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2503-SL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'SL' OR lt.name = 'SL')
WHERE e."employeeCode" = '2503'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2503-EL',
  e.id,
  lt.id,
  3.5::double precision,
  0::double precision,
  3.5::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'EL' OR lt.name = 'EL')
WHERE e."employeeCode" = '2503'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();

-- Neha Raj [2171]
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2171-CL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'CL' OR lt.name = 'CL')
WHERE e."employeeCode" = '2171'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2171-SL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'SL' OR lt.name = 'SL')
WHERE e."employeeCode" = '2171'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2171-EL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'EL' OR lt.name = 'EL')
WHERE e."employeeCode" = '2171'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();

-- Ayan Siddhiqui [2367]
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2367-CL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'CL' OR lt.name = 'CL')
WHERE e."employeeCode" = '2367'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2367-SL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'SL' OR lt.name = 'SL')
WHERE e."employeeCode" = '2367'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2367-EL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'EL' OR lt.name = 'EL')
WHERE e."employeeCode" = '2367'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();

-- Gagandeep Singh [2053]
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2053-CL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'CL' OR lt.name = 'CL')
WHERE e."employeeCode" = '2053'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2053-SL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'SL' OR lt.name = 'SL')
WHERE e."employeeCode" = '2053'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2053-EL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'EL' OR lt.name = 'EL')
WHERE e."employeeCode" = '2053'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();

-- Saurabh Chaudhary [1321]
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-1321-CL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'CL' OR lt.name = 'CL')
WHERE e."employeeCode" = '1321'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-1321-SL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'SL' OR lt.name = 'SL')
WHERE e."employeeCode" = '1321'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-1321-EL',
  e.id,
  lt.id,
  0.5::double precision,
  0::double precision,
  0.5::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'EL' OR lt.name = 'EL')
WHERE e."employeeCode" = '1321'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();

-- Wasim Raza [1403]
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-1403-CL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'CL' OR lt.name = 'CL')
WHERE e."employeeCode" = '1403'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-1403-SL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'SL' OR lt.name = 'SL')
WHERE e."employeeCode" = '1403'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-1403-EL',
  e.id,
  lt.id,
  4.0::double precision,
  0::double precision,
  4.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'EL' OR lt.name = 'EL')
WHERE e."employeeCode" = '1403'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();

-- Mayank Jain [1836]
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-1836-CL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'CL' OR lt.name = 'CL')
WHERE e."employeeCode" = '1836'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-1836-SL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'SL' OR lt.name = 'SL')
WHERE e."employeeCode" = '1836'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-1836-EL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'EL' OR lt.name = 'EL')
WHERE e."employeeCode" = '1836'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();

-- Manohar Chaudhary [2311]
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2311-CL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'CL' OR lt.name = 'CL')
WHERE e."employeeCode" = '2311'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2311-SL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'SL' OR lt.name = 'SL')
WHERE e."employeeCode" = '2311'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2311-EL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'EL' OR lt.name = 'EL')
WHERE e."employeeCode" = '2311'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();

-- Neha Mandal [2313]
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2313-CL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'CL' OR lt.name = 'CL')
WHERE e."employeeCode" = '2313'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2313-SL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'SL' OR lt.name = 'SL')
WHERE e."employeeCode" = '2313'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2313-EL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'EL' OR lt.name = 'EL')
WHERE e."employeeCode" = '2313'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();

-- Sajid Hussain [1445]
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-1445-CL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'CL' OR lt.name = 'CL')
WHERE e."employeeCode" = '1445'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-1445-SL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'SL' OR lt.name = 'SL')
WHERE e."employeeCode" = '1445'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-1445-EL',
  e.id,
  lt.id,
  6.0::double precision,
  0::double precision,
  6.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'EL' OR lt.name = 'EL')
WHERE e."employeeCode" = '1445'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();

-- Shubham Tyagi [2414]
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2414-CL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'CL' OR lt.name = 'CL')
WHERE e."employeeCode" = '2414'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2414-SL',
  e.id,
  lt.id,
  0.5::double precision,
  0::double precision,
  0.5::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'SL' OR lt.name = 'SL')
WHERE e."employeeCode" = '2414'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2414-EL',
  e.id,
  lt.id,
  3.0::double precision,
  0::double precision,
  3.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'EL' OR lt.name = 'EL')
WHERE e."employeeCode" = '2414'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();

-- C. P. Singh [1330]
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-1330-CL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'CL' OR lt.name = 'CL')
WHERE e."employeeCode" = '1330'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-1330-SL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'SL' OR lt.name = 'SL')
WHERE e."employeeCode" = '1330'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-1330-EL',
  e.id,
  lt.id,
  0.5::double precision,
  0::double precision,
  0.5::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'EL' OR lt.name = 'EL')
WHERE e."employeeCode" = '1330'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();

-- Mohit Sharma [2357]
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2357-CL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'CL' OR lt.name = 'CL')
WHERE e."employeeCode" = '2357'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2357-SL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'SL' OR lt.name = 'SL')
WHERE e."employeeCode" = '2357'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2357-EL',
  e.id,
  lt.id,
  6.0::double precision,
  0::double precision,
  6.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'EL' OR lt.name = 'EL')
WHERE e."employeeCode" = '2357'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();

-- Kritika Kumari [2510]
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2510-CL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'CL' OR lt.name = 'CL')
WHERE e."employeeCode" = '2510'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2510-SL',
  e.id,
  lt.id,
  1.0::double precision,
  0::double precision,
  1.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'SL' OR lt.name = 'SL')
WHERE e."employeeCode" = '2510'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2510-EL',
  e.id,
  lt.id,
  3.0::double precision,
  0::double precision,
  3.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'EL' OR lt.name = 'EL')
WHERE e."employeeCode" = '2510'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();

-- Vaishali Tomar [2362]
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2362-CL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'CL' OR lt.name = 'CL')
WHERE e."employeeCode" = '2362'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2362-SL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'SL' OR lt.name = 'SL')
WHERE e."employeeCode" = '2362'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();
INSERT INTO "LeaveBalance" (
  id,
  "employeeId",
  "leaveTypeId",
  allocated,
  used,
  remaining,
  "createdAt",
  "updatedAt"
)
SELECT
  'import-2362-EL',
  e.id,
  lt.id,
  0.0::double precision,
  0::double precision,
  0.0::double precision,
  NOW(),
  NOW()
FROM "Employee" e
JOIN "LeaveTypeMaster" lt
  ON (lt.code = 'EL' OR lt.name = 'EL')
WHERE e."employeeCode" = '2362'
ON CONFLICT ("employeeId", "leaveTypeId") DO UPDATE
SET
  allocated = EXCLUDED.allocated,
  used = EXCLUDED.used,
  remaining = EXCLUDED.remaining,
  "updatedAt" = NOW();

COMMIT;

-- Matched rows: 26
-- Unmatched rows: 0
-- Ambiguous rows: 0
