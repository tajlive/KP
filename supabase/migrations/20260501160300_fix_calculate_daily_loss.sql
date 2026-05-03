-- ============================================================================
-- Fix: calculate_daily_loss references dropped auto_trading_trades table
-- Date: 2026-05-01
-- Context: Function referenced auto_trading_trades, dropped 2026-04-22.
-- Rewritten to use the unified trades table.
-- ============================================================================

-- Drop ALL legacy signatures to consolidate into one canonical function
DROP FUNCTION IF EXISTS public.calculate_daily_loss(UUID, UUID);
DROP FUNCTION IF EXISTS public.calculate_daily_loss(UUID);
DROP FUNCTION IF EXISTS public.calculate_daily_loss();

CREATE OR REPLACE FUNCTION public.calculate_daily_loss(
  p_user_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_loss NUMERIC;
BEGIN
  SELECT COALESCE(SUM(ABS(COALESCE(realized_pnl, 0))), 0)
  INTO v_daily_loss
  FROM public.trades
  WHERE user_id = p_user_id
    AND realized_pnl < 0
    AND is_mock = false
    AND DATE(executed_at) = p_date
    AND status::text NOT IN ('cancelled', 'failed');

  RETURN v_daily_loss;
END;
$$;

COMMENT ON FUNCTION public.calculate_daily_loss(UUID, DATE) IS
  'Calculates total realized loss for a user on a given date. Uses unified trades table. Filters out cancelled/failed trades and mock data.';

GRANT EXECUTE ON FUNCTION public.calculate_daily_loss(UUID, DATE) TO authenticated;
