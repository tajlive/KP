-- Migration: Legg til strategy_id og paper_bot_id på onboarding_progress
-- Dato: 2026-03-03
-- Beskrivelse: Lagrer valgt strategi fra onboarding-wizard og kobler til opprettet paper bot

ALTER TABLE onboarding_progress
  ADD COLUMN IF NOT EXISTS strategy_id TEXT,
  ADD COLUMN IF NOT EXISTS paper_bot_id UUID;

-- Kommentar for dokumentasjon
COMMENT ON COLUMN onboarding_progress.strategy_id IS
  'ID for valgt auto-trading strategi i onboarding (trend, dca, grid, breakout, ai)';

COMMENT ON COLUMN onboarding_progress.paper_bot_id IS
  'UUID-referanse til boten som ble opprettet automatisk etter fullført onboarding';
