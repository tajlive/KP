-- Fix: Add missing columns to portfolios table
-- These were supposed to be added by 20260702000006_db_lint_p0_blocker_fixes
-- but only current_balance and description were created
-- Discovered by auto-healer cron (2026-07-17): 
--   "column portfolios.initial_balance does not exist" in Postgres logs

ALTER TABLE IF EXISTS public.portfolios
  ADD COLUMN IF NOT EXISTS initial_balance DECIMAL(15,2) DEFAULT 100000.00,
  ADD COLUMN IF NOT EXISTS total_invested DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_profit DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_profit_percent DECIMAL(8,2) DEFAULT 0;

-- Backfill initial_balance for existing rows
UPDATE public.portfolios
SET initial_balance = 100000.00
WHERE initial_balance IS NULL;
