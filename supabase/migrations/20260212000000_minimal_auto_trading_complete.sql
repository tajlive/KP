-- Minimal Auto-Trading System Migration
-- Focused on essential tables without legacy schema conflicts
-- This migration assumes basic tables (profiles, auto_trades, etc) already exist

-- ============================================
-- 1. auto_trading_settings (Per-user config)
-- ============================================
CREATE TABLE IF NOT EXISTS auto_trading_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')) DEFAULT 'low',
  max_auto_allocation_percent INT NOT NULL DEFAULT 10 CHECK (max_auto_allocation_percent > 0 AND max_auto_allocation_percent <= 100),
  order_mode TEXT NOT NULL CHECK (order_mode IN ('fixed_amount', 'percentage_of_auto_budget')) DEFAULT 'fixed_amount',
  fixed_order_amount_nok FLOAT,
  order_percent_of_auto_budget INT CHECK (order_percent_of_auto_budget > 0 AND order_percent_of_auto_budget <= 100),
  max_trades_per_day_per_coin INT DEFAULT 2 CHECK (max_trades_per_day_per_coin > 0),
  min_time_between_trades_minutes INT DEFAULT 180 CHECK (min_time_between_trades_minutes > 0),
  ma_short INT DEFAULT 12 CHECK (ma_short > 0),
  ma_long INT DEFAULT 26 CHECK (ma_long > 0),
  rsi_oversold INT DEFAULT 30 CHECK (rsi_oversold > 0 AND rsi_oversold < 100),
  rsi_overbought INT DEFAULT 70 CHECK (rsi_overbought > 0 AND rsi_overbought < 100),
  stop_loss_percent FLOAT DEFAULT 3.0 CHECK (stop_loss_percent > 0),
  take_profit_percent FLOAT DEFAULT 6.0 CHECK (take_profit_percent > 0),
  auto_trading_enabled BOOLEAN DEFAULT false,
  use_compounding BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auto_trading_settings_user_id ON auto_trading_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_trading_settings_risk_level ON auto_trading_settings(risk_level);

ALTER TABLE auto_trading_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own auto-trading settings" ON auto_trading_settings;
CREATE POLICY "Users can manage own auto-trading settings"
  ON auto_trading_settings
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON auto_trading_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON auto_trading_settings TO service_role;

-- ============================================
-- 2. auto_trading_markets (Which coins to trade)
-- ============================================
CREATE TABLE IF NOT EXISTS auto_trading_markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_auto_trading_markets_user_id ON auto_trading_markets(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_trading_markets_enabled ON auto_trading_markets(enabled);

ALTER TABLE auto_trading_markets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own auto-trading markets" ON auto_trading_markets;
CREATE POLICY "Users can manage own auto-trading markets"
  ON auto_trading_markets
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON auto_trading_markets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON auto_trading_markets TO service_role;

-- ============================================
-- 3. auto_trading_runs (Audit log)
-- ============================================
CREATE TABLE IF NOT EXISTS auto_trading_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  run_timestamp TIMESTAMPTZ DEFAULT NOW(),
  binance_balance_nok FLOAT,
  max_auto_budget_nok FLOAT,
  allocated_in_open_trades_nok FLOAT,
  available_auto_budget_nok FLOAT,
  signals_evaluated INT DEFAULT 0,
  trades_placed INT DEFAULT 0,
  total_order_value_nok FLOAT DEFAULT 0,
  trades_bought INT DEFAULT 0,
  trades_sold INT DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'partial')) DEFAULT 'success',
  error_message TEXT,
  execution_time_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auto_trading_runs_user_id ON auto_trading_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_trading_runs_timestamp ON auto_trading_runs(run_timestamp);
CREATE INDEX IF NOT EXISTS idx_auto_trading_runs_status ON auto_trading_runs(status);

ALTER TABLE auto_trading_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own auto-trading runs" ON auto_trading_runs;
CREATE POLICY "Users can read own auto-trading runs"
  ON auto_trading_runs FOR SELECT
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON auto_trading_runs TO service_role;

-- ============================================
-- 4. Extend auto_trades with auto-trading fields
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auto_trades' AND column_name = 'is_auto_trade'
  ) THEN
    ALTER TABLE auto_trades ADD COLUMN is_auto_trade BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auto_trades' AND column_name = 'auto_trading_run_id'
  ) THEN
    ALTER TABLE auto_trades ADD COLUMN auto_trading_run_id UUID REFERENCES auto_trading_runs(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_auto_trades_is_auto_trade ON auto_trades(is_auto_trade);
CREATE INDEX IF NOT EXISTS idx_auto_trades_auto_trading_run_id ON auto_trades(auto_trading_run_id);

-- ============================================
-- Helper function for budget calculation
-- ============================================
DROP FUNCTION IF EXISTS get_available_auto_budget(uuid);
CREATE OR REPLACE FUNCTION get_available_auto_budget(p_user_id uuid)
RETURNS TABLE (
  binance_balance_nok float,
  max_auto_budget_nok float,
  allocated_in_open_trades_nok float,
  available_auto_budget_nok float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE((SELECT total_value_nok FROM portfolio_summary WHERE user_id = p_user_id), 0)::float as binance_balance_nok,
    COALESCE((SELECT total_value_nok FROM portfolio_summary WHERE user_id = p_user_id), 0)::float *
      (SELECT COALESCE(max_auto_allocation_percent, 10)::float / 100 FROM auto_trading_settings WHERE user_id = p_user_id LIMIT 1) as max_auto_budget_nok,
    COALESCE((SELECT SUM(quantity_nok) FROM auto_trades WHERE user_id = p_user_id AND status = 'open' AND is_auto_trade = true), 0)::float as allocated_in_open_trades_nok,
    COALESCE((SELECT total_value_nok FROM portfolio_summary WHERE user_id = p_user_id), 0)::float *
      (SELECT COALESCE(max_auto_allocation_percent, 10)::float / 100 FROM auto_trading_settings WHERE user_id = p_user_id LIMIT 1) -
      COALESCE((SELECT SUM(quantity_nok) FROM auto_trades WHERE user_id = p_user_id AND status = 'open' AND is_auto_trade = true), 0)::float as available_auto_budget_nok;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- Success message
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Auto-trading system deployed successfully!';
  RAISE NOTICE '✅ Tables created: auto_trading_settings, auto_trading_markets, auto_trading_runs';
  RAISE NOTICE '✅ auto_trades extended with auto-trading tracking';
  RAISE NOTICE '✅ Budget calculation function ready';
END;
$$;
