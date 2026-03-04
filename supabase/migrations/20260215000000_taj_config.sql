-- ============================================================
-- 20260215000000_taj_config.sql
-- Setup Auto-Trading for Taj (Profit Maximization Mode)
-- ============================================================

DO $$
DECLARE
  v_user_id UUID;
  v_strategy_id UUID;
BEGIN
  -- 1. Get User ID for 'tomarnejensen@gmail.com'
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'tomarnejensen@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User tomarnejensen@gmail.com not found. Skipping config.';
    RETURN;
  END IF;

  -- 2. Get Strategy ID for 'Konservativ' (or similar)
  SELECT id INTO v_strategy_id FROM auto_trading_strategies WHERE risk_level = 'conservative' LIMIT 1;

  -- 3. Upsert User Config
  INSERT INTO user_auto_trading_configs (
    user_id,
    strategy_id,
    is_enabled,
    is_paper_trading,
    trading_capital_nok,
    phase,
    allocated_capital_pct,
    -- Custom Overrides for Profit Maximization
    custom_params
  ) VALUES (
    v_user_id,
    v_strategy_id,
    true,   -- Enable Auto-Trading
    true,   -- Start with PAPER TRADING
    1000000.00, -- 1M Paper Money
    'paper',
    30.00,  -- Use 30% of capital
    jsonb_build_object(
      'order_amount_nok', 40,
      'ma_short', 12,
      'ma_long', 26,
      'rsi_oversold', 30,
      'rsi_overbought', 70,
      'trailing_stop_activation_pct', 5.0,
      'trailing_stop_callback_pct', 3.0,
      'partial_tp_pct', 8.0,
      'partial_tp_ratio', 0.5
    )
  )
  ON CONFLICT (user_id) DO UPDATE SET
    is_enabled = EXCLUDED.is_enabled,
    custom_params = EXCLUDED.custom_params,
    updated_at = NOW();

  RAISE NOTICE 'Auto-trading config updated for user %', v_user_id;

END $$;
