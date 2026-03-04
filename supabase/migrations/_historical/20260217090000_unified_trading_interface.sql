-- Migration: Unified Trading Interface + Realistic Slippage Simulation
-- Date: 2026-02-17
-- Description: Adds columns for paper→live transition tracking and slippage tracking

-- Add transition readiness tracking columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS paper_trades_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS paper_profitability_percentage DECIMAL(10,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS paper_max_drawdown_percentage DECIMAL(10,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS paper_avg_hold_time_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS transition_readiness_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS first_live_trade_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS hybrid_mode_enabled BOOLEAN DEFAULT false;

-- Add slippage tracking to paper_trades
ALTER TABLE paper_trades
ADD COLUMN IF NOT EXISTS slippage_bps DECIMAL(10,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS slippage_amount DECIMAL(20,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS execution_price DECIMAL(20,8),
ADD COLUMN IF NOT EXISTS requested_price DECIMAL(20,8);

-- Add volatility tracking for realistic slippage
CREATE TABLE IF NOT EXISTS market_volatility (
  symbol VARCHAR(20) PRIMARY KEY,
  volatility_24h DECIMAL(10,6) DEFAULT 0, -- 0-1 scale
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on market_volatility
ALTER TABLE market_volatility ENABLE ROW LEVEL SECURITY;

-- Allow all users to read volatility data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'market_volatility' 
    AND policyname = 'Allow all users to read volatility'
  ) THEN
    CREATE POLICY "Allow all users to read volatility"
      ON market_volatility FOR SELECT
      USING (true);
  END IF;
END $$;

-- Function to calculate slippage for paper trading
CREATE OR REPLACE FUNCTION calculate_paper_slippage(
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
) AS $$
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
  FROM market_volatility WHERE symbol = p_symbol;
  
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
$$ LANGUAGE plpgsql;

-- Function to update transition readiness score
CREATE OR REPLACE FUNCTION update_transition_readiness_score(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_trades_count INTEGER;
  v_profitability DECIMAL;
  v_max_dd DECIMAL;
  v_avg_hold INTEGER;
BEGIN
  -- Get paper trading stats
  SELECT
    COUNT(*),
    COALESCE(AVG(pnl_percentage), 0),
    COALESCE(MAX(ABS(pnl_percentage)), 0),
    COALESCE(AVG(EXTRACT(EPOCH FROM (closed_at - opened_at))/60), 0)::INTEGER
  INTO v_trades_count, v_profitability, v_max_dd, v_avg_hold
  FROM paper_trades
  WHERE user_id = p_user_id AND status = 'closed';
  
  -- Calculate score (0-100)
  IF v_trades_count >= 50 THEN 
    v_score := v_score + 30;
  ELSIF v_trades_count >= 25 THEN
    v_score := v_score + 15;
  ELSIF v_trades_count >= 10 THEN
    v_score := v_score + 5;
  END IF;
  
  IF v_profitability > 5 THEN 
    v_score := v_score + 25;
  ELSIF v_profitability > 2 THEN
    v_score := v_score + 15;
  ELSIF v_profitability > 0 THEN
    v_score := v_score + 10;
  END IF;
  
  IF v_max_dd < 15 THEN 
    v_score := v_score + 25;
  ELSIF v_max_dd < 25 THEN
    v_score := v_score + 15;
  ELSIF v_max_dd < 35 THEN
    v_score := v_score + 5;
  END IF;
  
  IF v_avg_hold > 15 THEN 
    v_score := v_score + 20;
  ELSIF v_avg_hold > 5 THEN
    v_score := v_score + 10;
  END IF;
  
  -- Update profile
  UPDATE profiles SET
    paper_trades_completed = v_trades_count,
    paper_profitability_percentage = v_profitability,
    paper_max_drawdown_percentage = v_max_dd,
    paper_avg_hold_time_minutes = v_avg_hold,
    transition_readiness_score = v_score,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to auto-update readiness score
-- Note: Uses exit_time instead of status since paper_trades doesn't have a status column
CREATE OR REPLACE FUNCTION trigger_update_readiness_score()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user_id from the related account
  SELECT user_id INTO v_user_id
  FROM paper_accounts
  WHERE id = NEW.account_id;
  
  IF v_user_id IS NOT NULL THEN
    PERFORM update_transition_readiness_score(v_user_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if not exists - triggers when exit_time is set (trade is closed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_readiness_on_trade_close'
  ) THEN
    CREATE TRIGGER update_readiness_on_trade_close
    AFTER UPDATE OF exit_time ON paper_trades
    FOR EACH ROW
    WHEN (NEW.exit_time IS NOT NULL AND OLD.exit_time IS NULL)
    EXECUTE FUNCTION trigger_update_readiness_score();
  END IF;
END $$;

-- Function to get paper trading stats for transition guide
CREATE OR REPLACE FUNCTION get_paper_trading_stats(p_user_id UUID)
RETURNS TABLE (
  trades_count INTEGER,
  profitability_percentage DECIMAL,
  max_drawdown_percentage DECIMAL,
  avg_hold_time_minutes INTEGER,
  readiness_score INTEGER
) AS $$
BEGIN
  -- Ensure stats are up to date
  PERFORM update_transition_readiness_score(p_user_id);
  
  RETURN QUERY
  SELECT 
    COALESCE(paper_trades_completed, 0),
    COALESCE(paper_profitability_percentage, 0),
    COALESCE(paper_max_drawdown_percentage, 0),
    COALESCE(paper_avg_hold_time_minutes, 0),
    COALESCE(transition_readiness_score, 0)
  FROM profiles
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to place paper trade with slippage
CREATE OR REPLACE FUNCTION place_paper_trade_with_slippage(
  p_user_id UUID,
  p_symbol VARCHAR,
  p_side VARCHAR,
  p_order_type VARCHAR,
  p_amount DECIMAL,
  p_requested_price DECIMAL
)
RETURNS TABLE (
  trade_id UUID,
  execution_price DECIMAL(20,8),
  slippage_bps DECIMAL(10,4),
  slippage_amount DECIMAL(20,8)
) AS $$
DECLARE
  v_trade_id UUID;
  v_exec_price DECIMAL(20,8);
  v_slippage_bps DECIMAL(10,4);
  v_slippage_amt DECIMAL(20,8);
  v_reason TEXT;
BEGIN
  -- Calculate slippage
  SELECT * INTO v_exec_price, v_slippage_bps, v_slippage_amt, v_reason
  FROM calculate_paper_slippage(p_symbol, p_side, p_order_type, p_amount, p_requested_price);
  
  -- Insert trade with slippage data
  INSERT INTO paper_trades (
    user_id,
    symbol,
    side,
    type,
    amount,
    entry_price,
    requested_price,
    execution_price,
    slippage_bps,
    slippage_amount,
    status,
    opened_at
  ) VALUES (
    p_user_id,
    p_symbol,
    p_side,
    p_order_type,
    p_amount,
    v_exec_price,
    p_requested_price,
    v_exec_price,
    v_slippage_bps,
    v_slippage_amt,
    'open',
    NOW()
  )
  RETURNING id INTO v_trade_id;
  
  RETURN QUERY SELECT v_trade_id, v_exec_price, v_slippage_bps, v_slippage_amt;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON COLUMN profiles.transition_readiness_score IS 'Score 0-100 indicating readiness for live trading';
COMMENT ON COLUMN profiles.paper_trades_completed IS 'Total number of completed paper trades';
COMMENT ON COLUMN profiles.paper_profitability_percentage IS 'Average P&L percentage from paper trades';
COMMENT ON COLUMN profiles.paper_max_drawdown_percentage IS 'Maximum drawdown experienced in paper trading';
COMMENT ON COLUMN profiles.paper_avg_hold_time_minutes IS 'Average position hold time in minutes';
COMMENT ON COLUMN paper_trades.slippage_bps IS 'Simulated slippage in basis points (0.01% = 1bp)';
COMMENT ON COLUMN paper_trades.slippage_amount IS 'USD value of slippage cost';
COMMENT ON COLUMN paper_trades.execution_price IS 'Actual execution price after slippage';
COMMENT ON COLUMN paper_trades.requested_price IS 'Price user requested (before slippage)';
