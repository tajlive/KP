-- ============================================================================
-- MIGRATION: Add risk management to cron trades
-- Date: 2026-02-25
-- Author: KIMI Audit
-- ============================================================================
-- Purpose: Ensure cron-based trades respect risk limits
-- Risk: MEDIUM - Changes business logic
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Create risk check function for cron trades
-- ============================================================================
CREATE OR REPLACE FUNCTION check_trade_risk(
  p_user_id UUID,
  p_session_id UUID,
  p_trade_amount NUMERIC,
  p_current_capital NUMERIC
)
RETURNS TABLE (
  allowed BOOLEAN,
  reason TEXT,
  max_allowed_amount NUMERIC,
  risk_level TEXT
) AS $$
DECLARE
  v_daily_stats RECORD;
  v_session RECORD;
  v_max_position NUMERIC;
  v_daily_loss_limit NUMERIC;
  v_current_drawdown NUMERIC;
BEGIN
  -- Get session info
  SELECT * INTO v_session
  FROM trading_sessions
  WHERE id = p_session_id AND user_id = p_user_id;
  
  IF v_session IS NULL THEN
    RETURN QUERY SELECT false, 'Session not found', 0::NUMERIC, 'error'::TEXT;
    RETURN;
  END IF;
  
  -- Get or create daily stats
  SELECT * INTO v_daily_stats
  FROM auto_trade_daily_stats
  WHERE user_id = p_user_id AND date = CURRENT_DATE;
  
  IF v_daily_stats IS NULL THEN
    INSERT INTO auto_trade_daily_stats (user_id, date)
    VALUES (p_user_id, CURRENT_DATE)
    RETURNING * INTO v_daily_stats;
  END IF;
  
  -- Default risk limits (should come from user settings)
  v_max_position := LEAST(p_current_capital * 0.02, 10000); -- Max 2% or 10k
  v_daily_loss_limit := p_current_capital * 0.05; -- Max 5% daily loss
  
  -- Check 1: Position size limit
  IF p_trade_amount > v_max_position THEN
    RETURN QUERY SELECT 
      false, 
      format('Position size %s exceeds max %s (2%% limit)', 
        p_trade_amount, v_max_position),
      v_max_position,
      'high'::TEXT;
    RETURN;
  END IF;
  
  -- Check 2: Daily loss limit
  IF ABS(v_daily_stats.total_realized_loss) >= v_daily_loss_limit THEN
    RETURN QUERY SELECT 
      false,
      format('Daily loss limit reached: %s >= %s', 
        ABS(v_daily_stats.total_realized_loss), v_daily_loss_limit),
      0::NUMERIC,
      'critical'::TEXT;
    RETURN;
  END IF;
  
  -- Check 3: Max drawdown
  IF v_session.initial_capital > 0 THEN
    v_current_drawdown := (v_session.initial_capital - v_current_capital) / v_session.initial_capital * 100;
    IF v_current_drawdown > 15 THEN
      RETURN QUERY SELECT 
        false,
        format('Max drawdown exceeded: %s%% > 15%%', v_current_drawdown),
        0::NUMERIC,
        'critical'::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- Check 4: Daily trade limit
  IF v_daily_stats.total_trades >= 10 THEN
    RETURN QUERY SELECT 
      false,
      format('Daily trade limit reached: %s trades', v_daily_stats.total_trades),
      0::NUMERIC,
      'warning'::TEXT;
    RETURN;
  END IF;
  
  -- All checks passed
  RETURN QUERY SELECT 
    true,
    'Risk checks passed'::TEXT,
    p_trade_amount,
    'normal'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 2: Create trigger to validate trades before insert
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_trade_risk()
RETURNS TRIGGER AS $$
DECLARE
  v_session RECORD;
  v_risk_result RECORD;
  v_trade_amount NUMERIC;
BEGIN
  -- Only validate for new trades
  IF TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- Get session
  SELECT * INTO v_session
  FROM trading_sessions
  WHERE id = NEW.session_id;
  
  IF v_session IS NULL THEN
    RAISE EXCEPTION 'Invalid session_id: %', NEW.session_id;
  END IF;
  
  -- Calculate trade amount (use total_value as proxy)
  v_trade_amount := COALESCE(NEW.total_value, NEW.quantity * NEW.price, 0);
  
  -- Skip validation for very small amounts (dust trades)
  IF v_trade_amount < 1 THEN
    RETURN NEW;
  END IF;
  
  -- Check risk
  SELECT * INTO v_risk_result
  FROM check_trade_risk(
    NEW.user_id,
    NEW.session_id,
    v_trade_amount,
    v_session.current_capital
  );
  
  IF NOT v_risk_result.allowed THEN
    -- Log the blocked trade
    INSERT INTO auto_trading_logs (
      session_id,
      level,
      message,
      metadata
    ) VALUES (
      NEW.session_id,
      'warning',
      format('Trade blocked by risk manager: %s', v_risk_result.reason),
      jsonb_build_object(
        'trade_id', NEW.id,
        'user_id', NEW.user_id,
        'amount', v_trade_amount,
        'risk_level', v_risk_result.risk_level,
        'reason', v_risk_result.reason
      )
    );
    
    -- Raise exception to block the trade
    RAISE EXCEPTION 'Risk check failed: %', v_risk_result.reason
      USING ERRCODE = 'P0001';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger (disabled by default, enable after testing)
DROP TRIGGER IF EXISTS validate_trade_risk_trigger ON trades;
CREATE TRIGGER validate_trade_risk_trigger
  BEFORE INSERT ON trades
  FOR EACH ROW
  EXECUTE FUNCTION validate_trade_risk();

-- Disable initially - enable after verification
ALTER TABLE trades DISABLE TRIGGER validate_trade_risk_trigger;

-- ============================================================================
-- STEP 3: Add risk logging table if not exists
-- ============================================================================
CREATE TABLE IF NOT EXISTS auto_trading_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES trading_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warning', 'error', 'critical')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auto_trading_logs_session 
  ON auto_trading_logs (session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auto_trading_logs_user 
  ON auto_trading_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auto_trading_logs_level 
  ON auto_trading_logs (level) WHERE level IN ('error', 'critical', 'warning');

-- Enable RLS
ALTER TABLE auto_trading_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs"
  ON auto_trading_logs FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 4: Add risk metrics to trading_sessions
-- ============================================================================
ALTER TABLE trading_sessions
  ADD COLUMN IF NOT EXISTS daily_pnl NUMERIC(15,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS daily_trades INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_trade_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS risk_config JSONB DEFAULT '{}'::jsonb;

-- ============================================================================
-- STEP 5: Create function to reset daily stats
-- ============================================================================
CREATE OR REPLACE FUNCTION reset_daily_session_stats()
RETURNS VOID AS $$
BEGIN
  UPDATE trading_sessions
  SET 
    daily_pnl = 0,
    daily_trades = 0,
    updated_at = NOW()
  WHERE status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule daily reset at midnight
SELECT cron.schedule(
  'reset-daily-session-stats',
  '0 0 * * *',  -- Every day at midnight
  'SELECT reset_daily_session_stats()'
);

-- ============================================================================
-- STEP 6: Update session_update trigger to track daily stats
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_update_session_state()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE trading_sessions
  SET 
    current_capital = CASE
      WHEN NEW.side = 'buy' THEN current_capital - NEW.total_value - NEW.fee
      WHEN NEW.side = 'sell' THEN current_capital + NEW.total_value - NEW.fee
    END,
    open_position = CASE
      WHEN NEW.side = 'buy' THEN jsonb_build_object(
        'side', 'long',
        'quantity', NEW.quantity,
        'entry_price', NEW.price,
        'entry_time', NEW.executed_at
      )
      WHEN NEW.side = 'sell' THEN NULL
    END,
    total_trades = total_trades + 1,
    daily_trades = daily_trades + 1,
    winning_trades = CASE
      WHEN NEW.realized_pnl > 0 THEN winning_trades + 1
      ELSE winning_trades
    END,
    total_pnl = total_pnl + COALESCE(NEW.realized_pnl, 0),
    daily_pnl = daily_pnl + COALESCE(NEW.realized_pnl, 0),
    last_trade_at = NOW(),
    last_tick_at = NOW(),
    updated_at = NOW()
  WHERE id = NEW.session_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- ============================================================================
-- VERIFICATION & ENABLE INSTRUCTIONS
-- ============================================================================
/*
-- 1. Test risk check function
SELECT * FROM check_trade_risk(
  'your-user-id'::UUID,
  'your-session-id'::UUID,
  1000,  -- trade amount
  50000  -- current capital
);

-- 2. View recent risk blocks
SELECT * FROM auto_trading_logs 
WHERE level = 'warning'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Enable risk validation (AFTER TESTING!)
ALTER TABLE trades ENABLE TRIGGER validate_trade_risk_trigger;

-- 4. Disable if issues
ALTER TABLE trades DISABLE TRIGGER validate_trade_risk_trigger;
*/
