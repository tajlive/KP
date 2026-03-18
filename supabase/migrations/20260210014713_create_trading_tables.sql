-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- 1. Auto Trades Table
CREATE TABLE IF NOT EXISTS auto_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Trade info
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  order_type TEXT DEFAULT 'market',

  -- Amounts
  quantity FLOAT NOT NULL,
  quantity_nok FLOAT NOT NULL,
  price_per_unit FLOAT,

  -- P&L
  current_price FLOAT,
  pnl_nok FLOAT DEFAULT 0,
  pnl_percent FLOAT DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  close_price FLOAT,

  -- Binance info
  binance_order_id TEXT UNIQUE,
  binance_trade_id TEXT UNIQUE,

  -- Timestamps
  executed_at TIMESTAMP NOT NULL,
  closed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Indexes
  CONSTRAINT valid_quantity CHECK (quantity > 0),
  CONSTRAINT valid_price CHECK (price_per_unit IS NULL OR price_per_unit > 0)
);
CREATE INDEX IF NOT EXISTS idx_auto_trades_user_id ON auto_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_trades_status ON auto_trades(status);
CREATE INDEX IF NOT EXISTS idx_auto_trades_executed_at ON auto_trades(executed_at);
-- 2. Portfolio Summary (Cached calculations)
CREATE TABLE IF NOT EXISTS portfolio_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,

  -- Values
  total_value_nok FLOAT DEFAULT 0,
  total_profit_nok FLOAT DEFAULT 0,
  total_profit_percent FLOAT DEFAULT 0,

  -- Today
  daily_change_nok FLOAT DEFAULT 0,
  daily_change_percent FLOAT DEFAULT 0,

  -- Counts
  total_trades INT DEFAULT 0,
  open_trades INT DEFAULT 0,
  closed_trades INT DEFAULT 0,
  win_rate FLOAT DEFAULT 0,

  -- Last updated
  last_synced_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portfolio_summary_user_id ON portfolio_summary(user_id);
-- 3. Trade Sync Log
CREATE TABLE IF NOT EXISTS trade_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  status TEXT CHECK (status IN ('success', 'error', 'in_progress')),
  message TEXT,
  trades_fetched INT DEFAULT 0,
  trades_saved INT DEFAULT 0,
  error_message TEXT,

  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_trade_sync_log_user_id ON trade_sync_log(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_sync_log_started_at ON trade_sync_log(started_at);
-- 4. Enable RLS
ALTER TABLE auto_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_sync_log ENABLE ROW LEVEL SECURITY;
-- 5. RLS Policies
DROP POLICY IF EXISTS "Users can read own trades" ON auto_trades;
CREATE POLICY "Users can read own trades"
  ON auto_trades
  FOR SELECT
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own trades" ON auto_trades;
CREATE POLICY "Users can insert own trades"
  ON auto_trades
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own trades" ON auto_trades;
CREATE POLICY "Users can update own trades"
  ON auto_trades
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service role can manage trades" ON auto_trades;
CREATE POLICY "Service role can manage trades"
  ON auto_trades
  USING (current_setting('role') = 'authenticated')
  WITH CHECK (current_setting('role') = 'authenticated');
-- Portfolio Summary RLS
DROP POLICY IF EXISTS "Users can read own portfolio" ON portfolio_summary;
CREATE POLICY "Users can read own portfolio"
  ON portfolio_summary
  FOR SELECT
  USING (auth.uid() = user_id);
-- Trade Sync Log RLS
DROP POLICY IF EXISTS "Users can read own sync logs" ON trade_sync_log;
CREATE POLICY "Users can read own sync logs"
  ON trade_sync_log
  FOR SELECT
  USING (auth.uid() = user_id);
-- Grant permissions
GRANT SELECT ON auto_trades TO authenticated;
GRANT SELECT ON portfolio_summary TO authenticated;
GRANT SELECT ON trade_sync_log TO authenticated;
GRANT SELECT, INSERT, UPDATE ON auto_trades TO service_role;
GRANT SELECT, INSERT, UPDATE ON portfolio_summary TO service_role;
GRANT SELECT, INSERT ON trade_sync_log TO service_role;
