-- ============================================================================
-- Trading Cockpit: immutable helper for per-trade effective PnL fallback.
-- Matches effectivePnlDelta in src/lib/trading/build-trading-analytics.ts
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_effective_pnl(
  p_realized_pnl NUMERIC,
  p_total_value  NUMERIC,
  p_side         TEXT
)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT COALESCE(
    p_realized_pnl,
    CASE lower(trim(p_side))
      WHEN 'buy'  THEN -ABS(p_total_value)
      WHEN 'sell' THEN  ABS(p_total_value)
      ELSE 0
    END
  );
$$;

GRANT EXECUTE ON FUNCTION public.calculate_effective_pnl(NUMERIC, NUMERIC, TEXT)
  TO authenticated, service_role;
