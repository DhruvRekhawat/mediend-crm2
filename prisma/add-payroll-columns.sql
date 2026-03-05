-- Run this in Supabase SQL Editor (or psql) if migrate deploy failed.
-- Adds paidLeaves and lateFines to MonthlyPayroll so the app stops throwing P2022.
ALTER TABLE "MonthlyPayroll" ADD COLUMN IF NOT EXISTS "paidLeaves" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MonthlyPayroll" ADD COLUMN IF NOT EXISTS "lateFines" DOUBLE PRECISION NOT NULL DEFAULT 0;
