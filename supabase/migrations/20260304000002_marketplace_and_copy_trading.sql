/*
-- Phase 4 & 5: Marketplace reviews, strategy versions, and copy trading tables

-- ============================================================
-- Phase 4: Marketplace enhancements
-- ============================================================

-- Strategy Reviews
CREATE TABLE IF NOT EXISTS strategy_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(listing_id, user_id)
);

ALTER TABLE strategy_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews"
  ON strategy_reviews FOR SELECT USING (true);

CREATE POLICY "Users can insert own reviews"
  ON strategy_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Strategy Versions
CREATE TABLE IF NOT EXISTS strategy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  config JSONB NOT NULL,
  changelog TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(listing_id, version_number)
);

ALTER TABLE strategy_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view strategy versions"
  ON strategy_versions FOR SELECT USING (true);

-- ============================================================
-- Phase 5: Copy Trading enhancements
-- ============================================================

-- Copy Trading Configurations (follower settings per leader)
CREATE TABLE IF NOT EXISTS copy_trading_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leader_id UUID NOT NULL REFERENCES auth.users(id),
  max_allocation_nok DECIMAL NOT NULL DEFAULT 10000,
  sizing_mode TEXT NOT NULL DEFAULT 'proportional',
  max_leverage INTEGER DEFAULT 5,
  auto_stop_drawdown_pct DECIMAL DEFAULT 20,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_id, leader_id)
);

ALTER TABLE copy_trading_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own copy configs"
  ON copy_trading_configs FOR SELECT
  USING (auth.uid() = follower_id);

CREATE POLICY "Users can insert own copy configs"
  ON copy_trading_configs FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can update own copy configs"
  ON copy_trading_configs FOR UPDATE
  USING (auth.uid() = follower_id);

-- Copy Trade Execution Log
CREATE TABLE IF NOT EXISTS copy_trade_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES copy_trading_configs(id),
  original_trade_id UUID,
  copy_trade_id UUID,
  symbol TEXT,
  original_price DECIMAL,
  copy_price DECIMAL,
  slippage_pct DECIMAL,
  latency_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  failure_reason TEXT,
  risk_check_result JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE copy_trade_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own copy logs"
  ON copy_trade_log FOR SELECT
  USING (
    config_id IN (
      SELECT id FROM copy_trading_configs WHERE follower_id = auth.uid()
    )
  );

-- Enable Realtime on copy trade log for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS copy_trade_log;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS copy_trading_configs;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_copy_trade_log_config ON copy_trade_log(config_id);
CREATE INDEX IF NOT EXISTS idx_copy_trade_log_status ON copy_trade_log(status);
CREATE INDEX IF NOT EXISTS idx_copy_trading_configs_leader ON copy_trading_configs(leader_id);
CREATE INDEX IF NOT EXISTS idx_copy_trading_configs_follower ON copy_trading_configs(follower_id);
CREATE INDEX IF NOT EXISTS idx_strategy_reviews_listing ON strategy_reviews(listing_id);
*/;
