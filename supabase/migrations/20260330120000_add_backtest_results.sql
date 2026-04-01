-- Migration: Add backtest_results table for KLA-240
-- Created: 2026-03-30

-- Create backtest_results table
CREATE TABLE IF NOT EXISTS backtest_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  strategy TEXT NOT NULL CHECK (strategy IN ('SMA_CROSSOVER', 'RSI_MEAN_REVERSION', 'AI_SIGNALS')),
  interval TEXT NOT NULL CHECK (interval IN ('1d', '4h', '1h')),
  initial_capital NUMERIC(20, 8) NOT NULL,
  total_return_pct NUMERIC(10, 4) NOT NULL,
  max_drawdown_pct NUMERIC(10, 4) NOT NULL,
  sharpe_ratio NUMERIC(10, 4),
  win_rate NUMERIC(5, 2),
  total_trades INTEGER NOT NULL DEFAULT 0,
  profit_factor NUMERIC(10, 4),
  metrics JSONB,
  equity_curve JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_backtest_results_user_id ON backtest_results(user_id);
CREATE INDEX IF NOT EXISTS idx_backtest_results_created_at ON backtest_results(created_at);
CREATE INDEX IF NOT EXISTS idx_backtest_results_symbol ON backtest_results(symbol);

-- Enable RLS
ALTER TABLE backtest_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own backtest results"
  ON backtest_results
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own backtest results"
  ON backtest_results
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own backtest results"
  ON backtest_results
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own backtest results"
  ON backtest_results
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_backtest_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_backtest_results_updated_at ON backtest_results;
CREATE TRIGGER set_backtest_results_updated_at
  BEFORE UPDATE ON backtest_results
  FOR EACH ROW
  EXECUTE FUNCTION update_backtest_results_updated_at();

-- Add comment
COMMENT ON TABLE backtest_results IS 'Stores backtest results for trading strategies';
