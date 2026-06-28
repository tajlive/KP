-- Idempotent: recreate the slippage helper used by place_paper_trade_with_slippage.
-- This function was historically defined in _historical/20260217090000_unified_trading_interface.sql
-- and is required by the 5-step onboarding first-paper-trade flow.

CREATE TABLE IF NOT EXISTS public.market_volatility (
  symbol VARCHAR(20) PRIMARY KEY,
  volatility_24h DECIMAL(10,6) DEFAULT 0.1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.calculate_paper_slippage(
  p_symbol VARCHAR,
  p_side VARCHAR,
  p_order_type VARCHAR,
  p_amount DECIMAL,
  p_current_price DECIMAL
)
RETURNS TABLE (
  execution_price DECIMAL(20,8),
  slippage_bps DECIMAL(10,4),
  slippage_amount DECIMAL(20,8),
  reason TEXT
)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_base_slippage_bps DECIMAL := 5; -- 0.05%
  v_volatility DECIMAL;
  v_volatility_slippage_bps DECIMAL;
  v_notional_value DECIMAL;
  v_size_slippage_bps DECIMAL;
  v_hour INTEGER;
  v_is_off_hours BOOLEAN;
  v_time_slippage_bps DECIMAL;
  v_total_slippage_bps DECIMAL;
  v_slippage_multiplier INTEGER;
  v_slippage_percentage DECIMAL;
  v_exec_price DECIMAL(20,8);
  v_slippage_amt DECIMAL(20,8);
BEGIN
  -- Limit orders get no slippage
  IF p_order_type = 'limit' THEN
    RETURN QUERY SELECT
      p_current_price,
      0::DECIMAL(10,4),
      0::DECIMAL(20,8),
      'Limit order - no slippage'::TEXT;
    RETURN;
  END IF;

  -- Get volatility for symbol (default 0.1)
  SELECT COALESCE(volatility_24h, 0.1) INTO v_volatility
  FROM public.market_volatility WHERE symbol = p_symbol;

  IF v_volatility IS NULL THEN
    v_volatility := 0.1;
  END IF;

  -- Calculate volatility slippage (0-0.2%)
  v_volatility_slippage_bps := v_volatility * 20;

  -- Calculate order size slippage
  v_notional_value := p_amount * p_current_price;
  v_size_slippage_bps := LEAST((v_notional_value / 100000) * 5, 30); -- Max 0.3%

  -- Calculate time of day slippage
  v_hour := EXTRACT(HOUR FROM NOW() AT TIME ZONE 'UTC');
  v_is_off_hours := v_hour < 6 OR v_hour > 22;
  v_time_slippage_bps := CASE WHEN v_is_off_hours THEN 10 ELSE 0 END;

  -- Total slippage in basis points
  v_total_slippage_bps := v_base_slippage_bps + v_volatility_slippage_bps + v_size_slippage_bps + v_time_slippage_bps;

  -- Apply slippage direction (buy = worse price higher, sell = worse price lower)
  v_slippage_multiplier := CASE WHEN p_side = 'buy' THEN 1 ELSE -1 END;
  v_slippage_percentage := (v_total_slippage_bps / 10000) * v_slippage_multiplier;

  -- Calculate execution price and slippage amount
  v_exec_price := p_current_price * (1 + v_slippage_percentage);
  v_slippage_amt := ABS(v_exec_price - p_current_price) * p_amount;

  RETURN QUERY SELECT
    v_exec_price,
    v_total_slippage_bps::DECIMAL(10,4),
    v_slippage_amt::DECIMAL(20,8),
    format('Base: %sbp, Volatility: %sbp, Size: %sbp, Time: %sbp',
           v_base_slippage_bps,
           ROUND(v_volatility_slippage_bps, 1),
           ROUND(v_size_slippage_bps, 1),
           v_time_slippage_bps)::TEXT;
END;
$$;
