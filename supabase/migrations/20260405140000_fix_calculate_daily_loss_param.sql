-- Migration: Fix calculate_daily_loss parameter mismatch
-- Problem: eksisterende funksjon har annen parameter signatur
-- Fix: DROP + CREATE for å tillate parameterendring
-- Dato: 2026-04-05

-- Fjern eksisterende funksjon (alle overloads)
DROP FUNCTION IF EXISTS calculate_daily_loss(UUID);
DROP FUNCTION IF EXISTS calculate_daily_loss(UUID, UUID);

-- Opprett med korrekt signatur
CREATE OR REPLACE FUNCTION calculate_daily_loss(
  p_user_id     UUID,
  p_strategy_id UUID DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    SUM(ABS(COALESCE(pnl, 0))),
    0
  )
  FROM auto_trading_trades
  WHERE user_id = p_user_id
    AND (p_strategy_id IS NULL OR strategy_id = p_strategy_id)
    AND status = 'closed'
    AND executed_at >= NOW() - INTERVAL '24 hours'
    AND pnl < 0;
$$;

GRANT EXECUTE ON FUNCTION calculate_daily_loss(UUID, UUID)
  TO authenticated;

-- Smoke-test (skal returnere 0):
-- SELECT calculate_daily_loss('00000000-0000-0000-0000-000000000000'::UUID);
