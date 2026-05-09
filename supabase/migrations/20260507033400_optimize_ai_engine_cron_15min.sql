-- ============================================================================
-- Migration: Optimize AI Engine Cron Frequency
-- Date: 2026-05-07
-- Author: KIMI Agent (autopilot optimization sprint)
-- ============================================================================
-- PROBLEM: ai-engine cron ran hourly (0 * * * *). Tick cron runs every 5 min.
--          With consensus threshold 65, signals were too sparse.
--          Only 1 trade in 2 days for tomarnejensen@gmail.com's autopilot.
--
-- FIX:   1. Increase ai-engine frequency from 1h → 15min
--        2. This pairs with threshold lowering (65/35 → 55/45) in code
--        3. More signal generation + more frequent updates = more trades
--
-- COMPETITOR BENCHMARK:
--   - Pionex: Grid bots react continuously (intra-minute)
--   - 3Commas: Signal bots check every 1-5 min
--   - Cryptohopper: AI scalping uses 5-15min timeframe
--   - Klarpakke target: 15min is conservative but 4x improvement over 1h
-- ============================================================================

-- Drop existing ai-engine cron job and recreate with 15-min schedule
SELECT cron.unschedule('klarpakke-ai-engine');

SELECT cron.schedule(
  'klarpakke-ai-engine',
  '*/15 * * * *',  -- Every 15 minutes (was: 0 * * * * hourly)
  $$SELECT klarpakke_trigger_cron('/api/cron/ai-engine')$$
);

-- Verify
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'klarpakke-ai-engine';
