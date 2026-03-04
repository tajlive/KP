-- Auto-Trading Settings and Configuration
-- Comprehensive auto-trading system with risk levels and budget management

-- ============================================
-- Table: auto_trading_settings
-- Per-user auto-trading configuration
-- ============================================
CREATE TABLE IF NOT EXISTS auto_trading_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,

  -- Risk level (determines default parameters)
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')) DEFAULT 'low',

  -- Money management
  max_auto_allocation_percent INT NOT NULL DEFAULT 10 CHECK (max_auto_allocation_percent > 0 AND max_auto_allocation_percent <= 100),
  order_mode TEXT NOT NULL CHECK (order_mode IN ('fixed_amount', 'percentage_of_auto_budget')) DEFAULT 'fixed_amount',
  fixed_order_amount_nok FLOAT,
  order_percent_of_auto_budget INT CHECK (order_percent_of_auto_budget > 0 AND order_percent_of_auto_budget <= 100),

  -- Trade frequency constraints
  max_trades_per_day_per_coin INT DEFAULT 2 CHECK (max_trades_per_day_per_coin > 0),
  min_time_between_trades_minutes INT DEFAULT 180 CHECK (min_time_between_trades_minutes > 0),

  -- Strategy parameters (moving averages)
  ma_short INT DEFAULT 12 CHECK (ma_short > 0),
  ma_long INT DEFAULT 26 CHECK (ma_long > 0),
  rsi_oversold INT DEFAULT 30 CHECK (rsi_oversold > 0 AND rsi_oversold < 100),
  rsi_overbought INT DEFAULT 70 CHECK (rsi_overbought > 0 AND rsi_overbought < 100),

  -- Risk management (in percent)
  stop_loss_percent FLOAT DEFAULT 3.0 CHECK (stop_loss_percent > 0),
  take_profit_percent FLOAT DEFAULT 6.0 CHECK (take_profit_percent > 0),

  -- Feature toggles
  auto_trading_enabled BOOLEAN DEFAULT false,
  use_compounding BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auto_trading_settings_user_id ON auto_trading_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_trading_settings_risk_level ON auto_trading_settings(risk_level);

-- RLS for auto_trading_settings
ALTER TABLE auto_trading_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own auto-trading settings" ON auto_trading_settings;
CREATE POLICY "Users can manage own auto-trading settings"
  ON auto_trading_settings
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Table: auto_trading_markets
-- Which coins are enabled for auto-trading per user
-- ============================================
CREATE TABLE IF NOT EXISTS auto_trading_markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,  -- e.g., 'BTCUSDT', 'ETHUSDT'
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_auto_trading_markets_user_id ON auto_trading_markets(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_trading_markets_enabled ON auto_trading_markets(enabled);

-- RLS for auto_trading_markets
ALTER TABLE auto_trading_markets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own auto-trading markets" ON auto_trading_markets;
CREATE POLICY "Users can manage own auto-trading markets"
  ON auto_trading_markets
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Table: auto_trading_runs
-- Audit log of each auto-trading execution
-- ============================================
CREATE TABLE IF NOT EXISTS auto_trading_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  run_timestamp TIMESTAMP DEFAULT NOW(),

  -- Budget snapshot at time of run
  binance_balance_nok FLOAT,
  max_auto_budget_nok FLOAT,
  allocated_in_open_trades_nok FLOAT,
  available_auto_budget_nok FLOAT,

  -- Run statistics
  signals_evaluated INT DEFAULT 0,  -- How many coins were checked
  trades_placed INT DEFAULT 0,
  total_order_value_nok FLOAT DEFAULT 0,
  trades_bought INT DEFAULT 0,
  trades_sold INT DEFAULT 0,

  -- Status and errors
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'partial')) DEFAULT 'success',
  error_message TEXT,
  execution_time_ms INT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auto_trading_runs_user_id ON auto_trading_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_trading_runs_timestamp ON auto_trading_runs(run_timestamp);
CREATE INDEX IF NOT EXISTS idx_auto_trading_runs_status ON auto_trading_runs(status);

-- RLS for auto_trading_runs
ALTER TABLE auto_trading_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own auto-trading runs" ON auto_trading_runs;
CREATE POLICY "Users can read own auto-trading runs"
  ON auto_trading_runs
  FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- Extend auto_trades table with auto-trading fields
-- ============================================
DO $$
BEGIN
  -- Add is_auto_trade column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auto_trades' AND column_name = 'is_auto_trade'
  ) THEN
    ALTER TABLE auto_trades ADD COLUMN is_auto_trade BOOLEAN DEFAULT false;
  END IF;

  -- Add auto_trading_run_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auto_trades' AND column_name = 'auto_trading_run_id'
  ) THEN
    ALTER TABLE auto_trades ADD COLUMN auto_trading_run_id UUID REFERENCES auto_trading_runs(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_auto_trades_is_auto_trade ON auto_trades(is_auto_trade);
CREATE INDEX IF NOT EXISTS idx_auto_trades_auto_trading_run_id ON auto_trades(auto_trading_run_id);

-- ============================================
-- Helper function: Get user's available auto-budget
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
  -- This is a placeholder; actual implementation would fetch Binance balance
  -- For now, we'll assume balance comes from elsewhere
  RETURN QUERY
  SELECT
    COALESCE((SELECT total_value_nok FROM portfolio_summary WHERE user_id = p_user_id), 0)::float as binance_balance_nok,
    COALESCE((SELECT total_value_nok FROM portfolio_summary WHERE user_id = p_user_id), 0)::float *
      (SELECT COALESCE(max_auto_allocation_percent, 10)::float / 100 FROM auto_trading_settings WHERE user_id = p_user_id) as max_auto_budget_nok,
    COALESCE((SELECT SUM(quantity_nok) FROM auto_trades WHERE user_id = p_user_id AND status = 'open' AND is_auto_trade = true), 0)::float as allocated_in_open_trades_nok,
    COALESCE((SELECT total_value_nok FROM portfolio_summary WHERE user_id = p_user_id), 0)::float *
      (SELECT COALESCE(max_auto_allocation_percent, 10)::float / 100 FROM auto_trading_settings WHERE user_id = p_user_id) -
      COALESCE((SELECT SUM(quantity_nok) FROM auto_trades WHERE user_id = p_user_id AND status = 'open' AND is_auto_trade = true), 0)::float as available_auto_budget_nok;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- Grants for auto-trading tables
-- ============================================
GRANT SELECT, INSERT, UPDATE ON auto_trading_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON auto_trading_markets TO authenticated;
GRANT SELECT ON auto_trading_runs TO authenticated;

GRANT SELECT, INSERT, UPDATE ON auto_trading_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON auto_trading_markets TO service_role;
GRANT SELECT, INSERT, UPDATE ON auto_trading_runs TO service_role;
