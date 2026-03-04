-- ============================================================
-- AUTO-TRADING SYSTEM
-- Complete schema for automated trading with risk management
-- ============================================================

-- ============================================================
-- 1. AUTO TRADING STRATEGIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS auto_trading_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('conservative', 'balanced', 'aggressive', 'custom')),
  description TEXT,

  -- Strategy parameters
  max_position_size_pct DECIMAL(5,2) DEFAULT 2.00, -- % of portfolio per trade
  stop_loss_pct DECIMAL(5,2) DEFAULT 5.00,
  take_profit_pct DECIMAL(5,2),
  daily_loss_limit_pct DECIMAL(5,2) DEFAULT 10.00,
  max_trades_per_day INTEGER DEFAULT 10,

  -- Trading rules
  allow_long BOOLEAN DEFAULT true,
  allow_short BOOLEAN DEFAULT false,
  max_leverage DECIMAL(3,1) DEFAULT 1.0,
  allowed_symbols TEXT[], -- Array of allowed trading pairs

  -- Expected performance
  expected_annual_return_pct DECIMAL(5,2),

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default strategies
INSERT INTO auto_trading_strategies (name, risk_level, description, max_position_size_pct, stop_loss_pct, daily_loss_limit_pct, allow_long, allow_short, max_leverage, allowed_symbols, expected_annual_return_pct)
VALUES
  ('Konservativ', 'conservative', 'DCA + Trend Following - Lav risiko, stabile coins', 2.00, 5.00, 10.00, true, false, 1.0, ARRAY['BTCUSDT', 'ETHUSDT'], 15.00),
  ('Balansert', 'balanced', 'Mean Reversion + Breakout - Moderat risiko, top 10 coins', 5.00, 8.00, 15.00, true, true, 1.5, ARRAY['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'DOTUSDT', 'MATICUSDT'], 30.00),
  ('Aggressiv', 'aggressive', 'Momentum + Volatility Breakout - Høy risiko, leverage', 10.00, 12.00, 20.00, true, true, 2.0, ARRAY['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'DOTUSDT', 'MATICUSDT', 'LINKUSDT', 'LTCUSDT', 'UNIUSDT', 'ATOMUSDT'], 60.00),
  ('Custom', 'custom', 'Egendefinert - Alle parametere kan justeres', 10.00, 15.00, 25.00, true, true, 5.0, ARRAY['BTCUSDT'], 50.00);

-- ============================================================
-- 2. USER AUTO TRADING CONFIGS
-- ============================================================
CREATE TABLE IF NOT EXISTS user_auto_trading_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id UUID NOT NULL REFERENCES auto_trading_strategies(id),

  -- Configuration
  is_enabled BOOLEAN DEFAULT false,
  is_paper_trading BOOLEAN DEFAULT true, -- Start in paper trading mode
  trading_capital_nok DECIMAL(15,2) DEFAULT 10000.00,

  -- Phase progression (mandatory 30-day paper trading)
  phase TEXT DEFAULT 'paper' CHECK (phase IN ('paper', 'micro', 'small', 'full')),
  phase_started_at TIMESTAMPTZ DEFAULT NOW(),
  phase_min_days INTEGER DEFAULT 30, -- Days required in current phase
  phase_profitable BOOLEAN DEFAULT false, -- Must be profitable to advance

  -- Capital allocation based on phase
  allocated_capital_pct DECIMAL(5,2) DEFAULT 10.00, -- % of trading_capital to use

  -- Custom parameters (for 'custom' strategy)
  custom_params JSONB,

  -- Safety limits (can override strategy defaults)
  override_stop_loss_pct DECIMAL(5,2),
  override_daily_loss_limit_pct DECIMAL(5,2),
  override_max_trades_per_day INTEGER,

  -- Auto profit extraction
  auto_extract_profit_enabled BOOLEAN DEFAULT true,
  auto_extract_profit_threshold_pct DECIMAL(5,2) DEFAULT 20.00,
  auto_extract_profit_amount_pct DECIMAL(5,2) DEFAULT 50.00, -- Extract 50% of profit

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_trade_at TIMESTAMPTZ,

  UNIQUE(user_id) -- One config per user
);

-- Enable RLS
ALTER TABLE user_auto_trading_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own config"
  ON user_auto_trading_configs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own config"
  ON user_auto_trading_configs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own config"
  ON user_auto_trading_configs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 3. AUTO TRADING SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS auto_trading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  config_id UUID NOT NULL REFERENCES user_auto_trading_configs(id) ON DELETE CASCADE,

  -- Session info
  strategy_name TEXT NOT NULL,
  is_paper_trading BOOLEAN DEFAULT true,
  phase TEXT NOT NULL,

  -- Capital tracking
  starting_capital_nok DECIMAL(15,2) NOT NULL,
  current_capital_nok DECIMAL(15,2) NOT NULL,
  allocated_capital_pct DECIMAL(5,2) NOT NULL,

  -- Performance
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  total_pnl_nok DECIMAL(15,2) DEFAULT 0,
  total_pnl_pct DECIMAL(8,2) DEFAULT 0,
  max_drawdown_pct DECIMAL(8,2) DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'stopped', 'error')),
  pause_reason TEXT,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE auto_trading_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own sessions"
  ON auto_trading_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_auto_trading_sessions_user ON auto_trading_sessions(user_id);
CREATE INDEX idx_auto_trading_sessions_status ON auto_trading_sessions(status);

-- ============================================================
-- 4. AUTO TRADING TRADES
-- ============================================================
CREATE TABLE IF NOT EXISTS auto_trading_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES auto_trading_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Trade details
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('LONG', 'SHORT')),
  entry_price DECIMAL(20,8) NOT NULL,
  exit_price DECIMAL(20,8),
  quantity DECIMAL(20,8) NOT NULL,
  position_value_nok DECIMAL(15,2) NOT NULL,
  leverage DECIMAL(3,1) DEFAULT 1.0,

  -- Risk management
  stop_loss_price DECIMAL(20,8),
  take_profit_price DECIMAL(20,8),
  stop_loss_pct DECIMAL(5,2),

  -- Performance
  pnl_nok DECIMAL(15,2),
  pnl_pct DECIMAL(8,2),
  fees_nok DECIMAL(10,2) DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'STOPPED', 'LIQUIDATED')),
  close_reason TEXT CHECK (close_reason IN ('take_profit', 'stop_loss', 'manual', 'circuit_breaker', 'daily_limit', 'timeout')),

  -- Risk score at entry
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  market_volatility_pct DECIMAL(5,2),

  -- Timestamps
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE auto_trading_trades ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own trades"
  ON auto_trading_trades FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_auto_trading_trades_session ON auto_trading_trades(session_id);
CREATE INDEX idx_auto_trading_trades_user ON auto_trading_trades(user_id);
CREATE INDEX idx_auto_trading_trades_status ON auto_trading_trades(status);
CREATE INDEX idx_auto_trading_trades_symbol ON auto_trading_trades(symbol);

-- ============================================================
-- 5. DAILY PERFORMANCE METRICS
-- ============================================================
CREATE TABLE IF NOT EXISTS auto_trading_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES auto_trading_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Daily stats
  trades_count INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,

  -- Performance
  daily_pnl_nok DECIMAL(15,2) DEFAULT 0,
  daily_pnl_pct DECIMAL(8,2) DEFAULT 0,
  cumulative_pnl_nok DECIMAL(15,2) DEFAULT 0,
  cumulative_pnl_pct DECIMAL(8,2) DEFAULT 0,

  -- Capital
  starting_capital_nok DECIMAL(15,2) NOT NULL,
  ending_capital_nok DECIMAL(15,2) NOT NULL,

  -- Risk metrics
  max_drawdown_pct DECIMAL(8,2) DEFAULT 0,
  win_rate_pct DECIMAL(5,2) DEFAULT 0,
  profit_factor DECIMAL(8,2),

  -- Circuit breaker triggers
  circuit_breaker_triggered BOOLEAN DEFAULT false,
  daily_loss_limit_reached BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(session_id, date)
);

-- Enable RLS
ALTER TABLE auto_trading_daily_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own metrics"
  ON auto_trading_daily_metrics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX idx_daily_metrics_session_date ON auto_trading_daily_metrics(session_id, date DESC);

-- ============================================================
-- 6. CIRCUIT BREAKER LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS auto_trading_circuit_breaker_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES auto_trading_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Trigger details
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('daily_loss_limit', 'consecutive_losses', 'high_volatility', 'flash_crash', 'low_liquidity', 'api_error', 'manual')),
  trigger_value TEXT, -- JSON details about what triggered it

  -- Action taken
  action TEXT NOT NULL CHECK (action IN ('pause', 'stop', 'reduce_position')),
  resume_at TIMESTAMPTZ,

  -- Status
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT, -- 'auto' or 'manual'

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE auto_trading_circuit_breaker_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own circuit breaker logs"
  ON auto_trading_circuit_breaker_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX idx_circuit_breaker_session ON auto_trading_circuit_breaker_logs(session_id);

-- ============================================================
-- 7. PROFIT EXTRACTION HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS auto_trading_profit_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES auto_trading_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Extraction details
  total_profit_nok DECIMAL(15,2) NOT NULL,
  total_profit_pct DECIMAL(8,2) NOT NULL,
  extracted_amount_nok DECIMAL(15,2) NOT NULL,
  extracted_pct DECIMAL(5,2) NOT NULL, -- Usually 50%
  remaining_profit_nok DECIMAL(15,2) NOT NULL,

  -- Capital before/after
  capital_before_nok DECIMAL(15,2) NOT NULL,
  capital_after_nok DECIMAL(15,2) NOT NULL,

  -- Method
  extraction_method TEXT DEFAULT 'auto' CHECK (extraction_method IN ('auto', 'manual')),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE auto_trading_profit_extractions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own extractions"
  ON auto_trading_profit_extractions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX idx_profit_extractions_session ON auto_trading_profit_extractions(session_id);

-- ============================================================
-- 8. FUNCTIONS & TRIGGERS
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_auto_trading_strategies_updated_at
  BEFORE UPDATE ON auto_trading_strategies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_auto_trading_configs_updated_at
  BEFORE UPDATE ON user_auto_trading_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auto_trading_sessions_updated_at
  BEFORE UPDATE ON auto_trading_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE auto_trading_strategies IS 'Pre-defined trading strategies with risk parameters';
COMMENT ON TABLE user_auto_trading_configs IS 'User-specific auto-trading configuration and phase tracking';
COMMENT ON TABLE auto_trading_sessions IS 'Active/historical auto-trading sessions with performance metrics';
COMMENT ON TABLE auto_trading_trades IS 'Individual trades executed by the auto-trading system';
COMMENT ON TABLE auto_trading_daily_metrics IS 'Daily aggregated performance metrics';
COMMENT ON TABLE auto_trading_circuit_breaker_logs IS 'Log of all circuit breaker activations';
COMMENT ON TABLE auto_trading_profit_extractions IS 'History of automatic profit extractions';

COMMENT ON COLUMN user_auto_trading_configs.phase IS 'paper: 30d paper trading → micro: 1% capital → small: 5% capital → full: 100% capital';
COMMENT ON COLUMN user_auto_trading_configs.phase_min_days IS 'Minimum days required in current phase before advancing';
COMMENT ON COLUMN user_auto_trading_configs.phase_profitable IS 'User must be profitable in phase to advance to next';
