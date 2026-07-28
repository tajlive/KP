-- Blokker is_mock=true i trades (2026-07-28)
--
-- Bakgrunn: eksterne test-scripts (scripts/auto-trade-cron*.mjs) har skrevet
-- 985 falske trades med tilfeldige priser/PnL direkte i prod (slettet samme
-- dag, backup i scratch/mock-backup-*.json). Ingen produksjonskode i src/
-- eller supabase/functions setter is_mock=true — kolonnen finnes kun for
-- test-scriptene. Denne constraint-en gjør at fremtidige mock-inserts feiler
-- HØRBART i stedet for å forurense dataene stille.
--
-- Idempotent: bruker DROP CONSTRAINT IF EXISTS før ADD.

ALTER TABLE public.trades
  DROP CONSTRAINT IF EXISTS trades_no_mock_rows;

ALTER TABLE public.trades
  ADD CONSTRAINT trades_no_mock_rows
  CHECK (is_mock IS NOT TRUE);
