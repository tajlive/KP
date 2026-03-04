-- Paper Trading Module for Klarpakke
-- 1M USD Simulator with 5 risk levels

-- Risk presets table (read-only reference data)
CREATE TABLE IF NOT EXISTS risk_presets (
  id TEXT PRIMARY KEY CHECK (id IN ('auto_low', 'low', 'standard', 'high', 'extreme')),
  name TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  position_pct DECIMAL(5,4) NOT NULL,        -- e.g., 0.0200 = 2%
  max_drawdown_pct DECIMAL(5,2) NOT NULL,    -- e.g., 5.00 = 5%
  atr_mult DECIMAL(4,2) NOT NULL,
  volatility_scale DECIMAL(4,2) NOT NULL,
  max_positions INTEGER NOT NULL DEFAULT 5,
  leverage_max DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  stop_loss_pct DECIMAL(5,2) NOT NULL DEFAULT 3.00,
  take_profit_pct DECIMAL(5,2) NOT NULL DEFAULT 9.00,
  trailing_stop BOOLEAN DEFAULT false,
  rebalance_freq TEXT CHECK (rebalance_freq IN ('daily', 'weekly', 'monthly')) DEFAULT 'weekly',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default risk presets
INSERT INTO risk_presets (
  id, name, name_en, description, color, icon,
  position_pct, max_drawdown_pct, atr_mult, volatility_scale,
  max_positions, leverage_max, stop_loss_pct, take_profit_pct,
  trailing_stop, rebalance_freq
) VALUES
  ('auto_low', 'Auto-Lav', 'Auto Low', 'AI tilpasser risiko basert på markedsforhold', '#10B981', 'Brain', 
   0.0100, 3.00, 1.5, 0.8, 3, 1.00, 2.00, 6.00, true, 'daily'),
  ('low', 'Lav', 'Low', 'Konservativ strategi med fokus på kapitalbevaring', '#3B82F6', 'Shield',
   0.0200, 5.00, 2.0, 1.0, 5, 1.00, 3.00, 9.00, false, 'weekly'),
  ('standard', 'Standard', 'Standard', 'Balansert risiko/avlønning for de fleste tradere', '#8B5CF6', 'Scale',
   0.0500, 10.00, 2.5, 1.2, 8, 2.00, 3.00, 9.00, true, 'weekly'),
  ('high', 'Høy', 'High', 'Aggressiv vekst med høyere risiko', '#F59E0B', 'TrendingUp',
   0.1000, 20.00, 3.0, 1.5, 12, 3.00, 5.00, 15.00, true, 'daily'),
  ('extreme', 'Ekstrem', 'Extreme', 'Maksimal risiko for erfarne tradere', '#EF4444', 'Zap',
   0.2000, 40.00, 4.0, 2.0, 20, 5.00, 8.00, 24.00, true, 'daily')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- Paper trading simulations
CREATE TABLE IF NOT EXISTS paper_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  preset_id TEXT NOT NULL REFERENCES risk_presets(id),
  initial_balance DECIMAL(18,8) NOT NULL DEFAULT 1000000.00,  -- 1M USD
  current_balance DECIMAL(18,8) NOT NULL DEFAULT 1000000.00,
  total_pnl DECIMAL(18,8) DEFAULT 0,
  total_pnl_pct DECIMAL(8,4) DEFAULT 0,
  max_drawdown DECIMAL(8,4) DEFAULT 0,
  sharpe_ratio DECIMAL(8,4),
  win_rate DECIMAL(5,2),
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  avg_trade_return DECIMAL(10,4) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{}'::jsonb,  -- Copy of preset settings at creation
  
  CONSTRAINT positive_balance CHECK (current_balance >= 0)
);

-- Paper trades (individual positions)
CREATE TABLE IF NOT EXISTS paper_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID NOT NULL REFERENCES paper_simulations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('LONG', 'SHORT')),
  entry_price DECIMAL(18,8) NOT NULL,
  exit_price DECIMAL(18,8),
  quantity DECIMAL(18,8) NOT NULL,
  position_value DECIMAL(18,8) NOT NULL,
  leverage DECIMAL(4,2) DEFAULT 1.00,
  stop_loss DECIMAL(18,8),
  take_profit DECIMAL(18,8),
  pnl DECIMAL(18,8),
  pnl_pct DECIMAL(8,4),
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'STOPPED')),
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  close_reason TEXT CHECK (close_reason IN ('TAKE_PROFIT', 'STOP_LOSS', 'MANUAL', 'LIQUIDATED', 'SIGNAL')),
  metadata JSONB DEFAULT '{}'::jsonb,
  signal_id UUID  -- Optional link to real signals
);

-- Leaderboard entries
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'all_time')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_display_name TEXT NOT NULL,
  avatar_url TEXT,
  simulation_id UUID NOT NULL REFERENCES paper_simulations(id) ON DELETE CASCADE,
  return_pct DECIMAL(10,4) NOT NULL DEFAULT 0,
  sharpe_ratio DECIMAL(8,4),
  win_rate DECIMAL(5,2),
  total_trades INTEGER DEFAULT 0,
  rank INTEGER NOT NULL,
  previous_rank INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  risk_level TEXT NOT NULL,
  is_public BOOLEAN DEFAULT true,
  
  UNIQUE(period, user_id, simulation_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_paper_simulations_user ON paper_simulations(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_paper_simulations_preset ON paper_simulations(preset_id);

-- Only create index if simulation_id column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paper_trades' AND column_name = 'simulation_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_paper_trades_simulation ON paper_trades(simulation_id, status);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_paper_trades_symbol ON paper_trades(symbol);

-- Only create index if necessary columns exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leaderboard_entries' AND column_name = 'period'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_leaderboard_period_rank ON leaderboard_entries(period, rank);
    CREATE INDEX IF NOT EXISTS idx_leaderboard_user ON leaderboard_entries(user_id);
  END IF;
END $$;

-- Row Level Security (RLS)
ALTER TABLE paper_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;

-- Users can only see their own simulations
CREATE POLICY "Users can view own simulations" 
  ON paper_simulations FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own simulations"
  ON paper_simulations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own simulations"
  ON paper_simulations FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only see their own trades (if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paper_trades' AND column_name = 'simulation_id'
  ) THEN
    EXECUTE '
      CREATE POLICY "Users can view own trades"
        ON paper_trades FOR SELECT
        USING (EXISTS (
          SELECT 1 FROM paper_simulations
          WHERE paper_simulations.id = paper_trades.simulation_id
          AND paper_simulations.user_id = auth.uid()
        ))
    ';

    EXECUTE '
      CREATE POLICY "Users can create trades for own simulations"
        ON paper_trades FOR INSERT
        WITH CHECK (EXISTS (
          SELECT 1 FROM paper_simulations
          WHERE paper_simulations.id = paper_trades.simulation_id
          AND paper_simulations.user_id = auth.uid()
        ))
    ';
  END IF;
END $$;

-- Leaderboard is public but users control visibility
CREATE POLICY "Public can view leaderboard"
  ON leaderboard_entries FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view own entries even if private"
  ON leaderboard_entries FOR SELECT
  USING (auth.uid() = user_id);

-- Functions

-- Update simulation stats when trade closes
CREATE OR REPLACE FUNCTION update_simulation_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'CLOSED' AND OLD.status = 'OPEN' THEN
    UPDATE paper_simulations
    SET 
      current_balance = current_balance + COALESCE(NEW.pnl, 0),
      total_pnl = total_pnl + COALESCE(NEW.pnl, 0),
      total_pnl_pct = ((current_balance + COALESCE(NEW.pnl, 0) - initial_balance) / initial_balance * 100),
      total_trades = total_trades + 1,
      winning_trades = CASE WHEN COALESCE(NEW.pnl, 0) > 0 THEN winning_trades + 1 ELSE winning_trades END,
      losing_trades = CASE WHEN COALESCE(NEW.pnl, 0) <= 0 THEN losing_trades + 1 ELSE losing_trades END,
      updated_at = NOW()
    WHERE id = NEW.simulation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_trade_close ON paper_trades;
CREATE TRIGGER on_trade_close
  AFTER UPDATE ON paper_trades
  FOR EACH ROW
  EXECUTE FUNCTION update_simulation_stats();

-- Calculate win rate function
CREATE OR REPLACE FUNCTION calculate_win_rate(sim_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  total INTEGER;
  wins INTEGER;
BEGIN
  SELECT COUNT(*), COUNT(CASE WHEN pnl > 0 THEN 1 END)
  INTO total, wins
  FROM paper_trades
  WHERE simulation_id = sim_id AND status = 'CLOSED';
  
  IF total = 0 THEN RETURN 0; END IF;
  RETURN (wins::DECIMAL / total * 100);
END;
$$ LANGUAGE plpgsql;

-- Saved strategies table
CREATE TABLE IF NOT EXISTS saved_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  strategy_type TEXT NOT NULL,
  strategy_params JSONB DEFAULT '{}'::jsonb,
  backtest_result JSONB,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_strategies_user ON saved_strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_strategies_favorite ON saved_strategies(user_id, is_favorite);

ALTER TABLE saved_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own strategies"
  ON saved_strategies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own strategies"
  ON saved_strategies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own strategies"
  ON saved_strategies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own strategies"
  ON saved_strategies FOR DELETE
  USING (auth.uid() = user_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_paper_simulations_updated_at ON paper_simulations;
CREATE TRIGGER update_paper_simulations_updated_at
  BEFORE UPDATE ON paper_simulations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_paper_trades_updated_at ON paper_trades;
CREATE TRIGGER update_paper_trades_updated_at
  BEFORE UPDATE ON paper_trades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leaderboard_entries_updated_at ON leaderboard_entries;
CREATE TRIGGER update_leaderboard_entries_updated_at
  BEFORE UPDATE ON leaderboard_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_saved_strategies_updated_at ON saved_strategies;
CREATE TRIGGER update_saved_strategies_updated_at
  BEFORE UPDATE ON saved_strategies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
