-- ═══════════════════════════════════════════════════════════════════════════
-- KLARPAKKE: ADD PAPER TRADING EXECUTION METADATA
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Purpose: Add columns to track realistic execution costs in paper trading
-- This makes paper trading identical to live trading for accurate backtesting
--
-- Added columns:
--   - fees_paid: Trading fees in base currency
--   - execution_time_ms: Time to execute trade (for performance monitoring)
--   - slippage_pct: Realized slippage percentage
--   - bid_price: Bid price at execution (for spread calculation)
--   - ask_price: Ask price at execution (for spread calculation)
--   - volume_24h: 24h volume at execution (for liquidity assessment)
--
-- Date: 2026-02-24
-- ═══════════════════════════════════════════════════════════════════════════

-- Add execution metadata columns to auto_trading_trades
ALTER TABLE auto_trading_trades 
ADD COLUMN IF NOT EXISTS fees_paid NUMERIC DEFAULT 0;

ALTER TABLE auto_trading_trades 
ADD COLUMN IF NOT EXISTS execution_time_ms INTEGER;

ALTER TABLE auto_trading_trades 
ADD COLUMN IF NOT EXISTS slippage_pct NUMERIC DEFAULT 0;

ALTER TABLE auto_trading_trades 
ADD COLUMN IF NOT EXISTS bid_price NUMERIC;

ALTER TABLE auto_trading_trades 
ADD COLUMN IF NOT EXISTS ask_price NUMERIC;

ALTER TABLE auto_trading_trades 
ADD COLUMN IF NOT EXISTS volume_24h NUMERIC;

-- Add execution logs table for monitoring paper vs live quality
CREATE TABLE IF NOT EXISTS execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  trading_mode TEXT NOT NULL CHECK (trading_mode IN ('paper', 'live')),
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell', 'LONG', 'SHORT')),
  type TEXT NOT NULL CHECK (type IN ('market', 'limit')),
  
  -- Prices
  binance_price NUMERIC NOT NULL,
  executed_price NUMERIC NOT NULL,
  bid_price NUMERIC,
  ask_price NUMERIC,
  price_deviation_pct NUMERIC NOT NULL,
  
  -- Costs
  slippage_pct NUMERIC NOT NULL,
  slippage_amount NUMERIC NOT NULL,
  fees_paid NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  
  -- Execution quality
  fill_rate NUMERIC NOT NULL DEFAULT 100, -- 0-100%
  execution_time_ms INTEGER NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for execution_logs
CREATE INDEX IF NOT EXISTS idx_execution_logs_user ON execution_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_timestamp ON execution_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_logs_mode ON execution_logs(trading_mode);
CREATE INDEX IF NOT EXISTS idx_execution_logs_symbol ON execution_logs(symbol);

-- Add index for session filtering on auto_trading_trades
CREATE INDEX IF NOT EXISTS idx_auto_trading_trades_session ON auto_trading_trades(session_id);

-- Comments
COMMENT ON COLUMN auto_trading_trades.fees_paid IS 'Trading fees paid (e.g., Binance 0.1% maker/taker)';
COMMENT ON COLUMN auto_trading_trades.execution_time_ms IS 'Time from order submission to execution in milliseconds';
COMMENT ON COLUMN auto_trading_trades.slippage_pct IS 'Realized slippage as percentage (0.1 = 0.1%)';
COMMENT ON COLUMN auto_trading_trades.bid_price IS 'Bid price at time of execution (for spread analysis)';
COMMENT ON COLUMN auto_trading_trades.ask_price IS 'Ask price at time of execution (for spread analysis)';
COMMENT ON COLUMN auto_trading_trades.volume_24h IS '24h trading volume at time of execution (for liquidity analysis)';

-- Note: View paper_trading_performance kan opprettes manuelt senere
-- hvis trading_mode eller is_paper kolonnen eksisterer

-- Create function to calculate total costs for a session
CREATE OR REPLACE FUNCTION calculate_session_costs(session_uuid UUID)
RETURNS TABLE (
  total_fees NUMERIC,
  total_slippage NUMERIC,
  total_costs NUMERIC,
  cost_per_trade NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(fees_paid), 0) as total_fees,
    COALESCE(SUM(slippage_pct / 100 * position_value_nok), 0) as total_slippage,
    COALESCE(SUM(fees_paid) + SUM(slippage_pct / 100 * position_value_nok), 0) as total_costs,
    CASE 
      WHEN COUNT(*) > 0 THEN (COALESCE(SUM(fees_paid), 0) + COALESCE(SUM(slippage_pct / 100 * position_value_nok), 0)) / COUNT(*)
      ELSE 0
    END as cost_per_trade
  FROM auto_trading_trades
  WHERE session_id = session_uuid;
END;
$$ LANGUAGE plpgsql;
