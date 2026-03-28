-- Migration: Fix calculate_daily_loss RPC
-- Problem: refererte 'trades' og 'session_id' som ikke eksisterer
-- Fix: bruk auto_trading_trades med korrekte kolonner (strategy_id, pnl)
-- Dato: 2026-03-28

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
