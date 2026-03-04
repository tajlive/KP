-- Auto-Trading System Database Migration
-- Oppretter tabeller for API-nøkler, auto-trade innstillinger, og trade-logging

-- Enable crypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- Tabell: trading_api_keys
-- Lagrer brukeres Binance API-nøkler (kryptert)
-- ============================================
CREATE TABLE IF NOT EXISTS trading_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- API-nøkler (kryptert)
  api_key_encrypted TEXT NOT NULL,
  api_secret_encrypted TEXT NOT NULL,
  
  -- Exchange info
  exchange TEXT NOT NULL DEFAULT 'binance',
  exchange_env TEXT NOT NULL DEFAULT 'live',
  
  -- Tillatelser
  permissions JSONB DEFAULT '["READ", "SPOT"]'::jsonb,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_valid BOOLEAN DEFAULT true,
  last_validated_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  
  -- Sikkerhet
  ip_whitelist TEXT[],
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_active_user_exchange UNIQUE (user_id, exchange, exchange_env)
);

-- Indekser for trading_api_keys
CREATE INDEX IF NOT EXISTS idx_trading_api_keys_user ON trading_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_api_keys_active ON trading_api_keys(is_active);

-- RLS policies for trading_api_keys
ALTER TABLE trading_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see own API keys" 
  ON trading_api_keys FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert own API keys" 
  ON trading_api_keys FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update own API keys" 
  ON trading_api_keys FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete own API keys" 
  ON trading_api_keys FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================
-- Tabell: auto_trade_settings
-- Brukerens auto-trading innstillinger og risikoprofil
-- ============================================
CREATE TABLE IF NOT EXISTS auto_trade_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Hovedbryter
  auto_trading_enabled BOOLEAN DEFAULT false,
  
  -- Risikoprofil
  risk_profile TEXT NOT NULL DEFAULT 'moderate' 
    CHECK (risk_profile IN ('conservative', 'moderate', 'aggressive')),
  max_position_percent DECIMAL(5,2) NOT NULL DEFAULT 2.00,
  
  -- Daglige grenser
  daily_loss_limit_percent DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  daily_trade_limit INTEGER NOT NULL DEFAULT 10,
  
  -- Signal-filtre
  min_confidence INTEGER DEFAULT 70 
    CHECK (min_confidence >= 0 AND min_confidence <= 100),
  allowed_symbols TEXT[],
  max_concurrent_positions INTEGER DEFAULT 5 
    CHECK (max_concurrent_positions >= 1 AND max_concurrent_positions <= 50),
  
  -- Minimumsordre
  min_order_size_usdt DECIMAL(10,2) DEFAULT 20.00,
  
  -- Notifications
  notify_on_trade BOOLEAN DEFAULT true,
  notify_on_sl_tp BOOLEAN DEFAULT true,
  notify_on_daily_limit BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indekser for auto_trade_settings
CREATE INDEX IF NOT EXISTS idx_auto_trade_settings_user ON auto_trade_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_trade_settings_enabled ON auto_trade_settings(auto_trading_enabled);

-- RLS policies for auto_trade_settings
ALTER TABLE auto_trade_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see own settings" 
  ON auto_trade_settings FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert own settings" 
  ON auto_trade_settings FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update own settings" 
  ON auto_trade_settings FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete own settings" 
  ON auto_trade_settings FOR DELETE 
  USING (auth.uid() = user_id);

-- Trigger for å opprette default settings når bruker opprettes
CREATE OR REPLACE FUNCTION create_default_auto_trade_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO auto_trade_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_auto_trade
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_auto_trade_settings();

-- ============================================
-- Tabell: auto_trades
-- Logger alle auto-trades og deres status
-- ============================================
CREATE TABLE IF NOT EXISTS auto_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_id UUID REFERENCES signals(id) ON DELETE SET NULL,
  
  -- Ordre-detaljer
  order_id TEXT,
  client_order_id TEXT,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
  
  -- Posisjonsstørrelse
  quantity DECIMAL(20,8),
  quantity_filled DECIMAL(20,8),
  
  -- Priser
  entry_price DECIMAL(20,8),
  exit_price DECIMAL(20,8),
  current_market_price DECIMAL(20,8),
  
  -- Stop-loss / Take-profit
  stop_loss DECIMAL(20,8),
  take_profit DECIMAL(20,8),
  
  -- PnL
  realized_pnl DECIMAL(20,8) DEFAULT 0,
  unrealized_pnl DECIMAL(20,8) DEFAULT 0,
  commission DECIMAL(20,8) DEFAULT 0,
  commission_asset TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'open', 'closed', 'cancelled', 'failed', 'rejected')),
  close_reason TEXT CHECK (close_reason IN ('stop_loss', 'take_profit', 'manual', 'signal')),
  
  -- Risikoinnstillinger brukt
  risk_profile_used TEXT,
  max_position_percent_used DECIMAL(5,2),
  
  -- Feilhåndtering
  error_code TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Tidsstempler
  created_at TIMESTAMPTZ DEFAULT NOW(),
  executed_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB
);

-- Indekser for auto_trades
CREATE INDEX IF NOT EXISTS idx_auto_trades_user ON auto_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_trades_user_status ON auto_trades(user_id, status);

-- Only create index if signal_id column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auto_trades' AND column_name = 'signal_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_auto_trades_signal ON auto_trades(signal_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_auto_trades_created ON auto_trades(created_at);
CREATE INDEX IF NOT EXISTS idx_auto_trades_symbol ON auto_trades(symbol);

-- RLS policies for auto_trades
ALTER TABLE auto_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see own trades" 
  ON auto_trades FOR SELECT 
  USING (auth.uid() = user_id);

-- Kun system kan insert/update (via service role)
CREATE POLICY "Service role can insert trades" 
  ON auto_trades FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Service role can update trades" 
  ON auto_trades FOR UPDATE 
  USING (true);

-- ============================================
-- Tabell: auto_trade_daily_stats
-- Daglige statistikker for rask risikovurdering
-- ============================================
CREATE TABLE IF NOT EXISTS auto_trade_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Counts
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  
  -- PnL
  total_pnl DECIMAL(20,8) DEFAULT 0,
  total_realized_loss DECIMAL(20,8) DEFAULT 0,
  total_realized_profit DECIMAL(20,8) DEFAULT 0,
  
  -- Limits tracking
  daily_loss_limit_reached BOOLEAN DEFAULT false,
  daily_trade_limit_reached BOOLEAN DEFAULT false,
  limit_reached_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

-- Indekser for auto_trade_daily_stats
CREATE INDEX IF NOT EXISTS idx_auto_trade_daily_stats_user ON auto_trade_daily_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_trade_daily_stats_date ON auto_trade_daily_stats(date);

-- RLS policies for auto_trade_daily_stats
ALTER TABLE auto_trade_daily_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see own stats" 
  ON auto_trade_daily_stats FOR SELECT 
  USING (auth.uid() = user_id);

-- ============================================
-- Views for enkel tilgang
-- ============================================

-- Views skipped - columns don't exist in current auto_trades schema
-- Will be recreated when auto_trades schema is finalized

-- ============================================
-- Functions
-- ============================================

-- Function: Oppdater eller opprett dagens stats
CREATE OR REPLACE FUNCTION upsert_daily_stats(
  p_user_id UUID,
  p_trade_pnl DECIMAL
)
RETURNS VOID AS $$
DECLARE
  v_date DATE := CURRENT_DATE;
BEGIN
  INSERT INTO auto_trade_daily_stats (
    user_id, 
    date, 
    total_trades, 
    total_pnl,
    total_realized_loss,
    total_realized_profit,
    winning_trades,
    losing_trades
  )
  VALUES (
    p_user_id,
    v_date,
    1,
    p_trade_pnl,
    CASE WHEN p_trade_pnl < 0 THEN p_trade_pnl ELSE 0 END,
    CASE WHEN p_trade_pnl >= 0 THEN p_trade_pnl ELSE 0 END,
    CASE WHEN p_trade_pnl >= 0 THEN 1 ELSE 0 END,
    CASE WHEN p_trade_pnl < 0 THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    total_trades = auto_trade_daily_stats.total_trades + 1,
    total_pnl = auto_trade_daily_stats.total_pnl + p_trade_pnl,
    total_realized_loss = auto_trade_daily_stats.total_realized_loss + 
      CASE WHEN p_trade_pnl < 0 THEN p_trade_pnl ELSE 0 END,
    total_realized_profit = auto_trade_daily_stats.total_realized_profit + 
      CASE WHEN p_trade_pnl >= 0 THEN p_trade_pnl ELSE 0 END,
    winning_trades = auto_trade_daily_stats.winning_trades + 
      CASE WHEN p_trade_pnl >= 0 THEN 1 ELSE 0 END,
    losing_trades = auto_trade_daily_stats.losing_trades + 
      CASE WHEN p_trade_pnl < 0 THEN 1 ELSE 0 END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Sjekk og oppdater limit status
CREATE OR REPLACE FUNCTION check_daily_limits(
  p_user_id UUID
)
RETURNS TABLE (
  loss_limit_reached BOOLEAN,
  trade_limit_reached BOOLEAN,
  current_loss_percent DECIMAL,
  current_trade_count INTEGER
) AS $$
DECLARE
  v_settings auto_trade_settings%ROWTYPE;
  v_stats auto_trade_daily_stats%ROWTYPE;
  v_portfolio_value DECIMAL := 10000; -- Default, bør hentes fra Binance
  v_loss_percent DECIMAL;
BEGIN
  -- Hent settings
  SELECT * INTO v_settings 
  FROM auto_trade_settings 
  WHERE user_id = p_user_id;
  
  -- Hent dagens stats
  SELECT * INTO v_stats 
  FROM auto_trade_daily_stats 
  WHERE user_id = p_user_id AND date = CURRENT_DATE;
  
  -- Beregn loss percent
  IF v_portfolio_value > 0 THEN
    v_loss_percent := ABS(v_stats.total_realized_loss) / v_portfolio_value * 100;
  ELSE
    v_loss_percent := 0;
  END IF;
  
  RETURN QUERY SELECT 
    v_loss_percent >= v_settings.daily_loss_limit_percent,
    v_stats.total_trades >= v_settings.daily_trade_limit,
    v_loss_percent,
    v_stats.total_trades;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Kommentarer
-- ============================================

COMMENT ON TABLE trading_api_keys IS 'Krypterte API-nøkler for trading integrasjoner';
COMMENT ON TABLE auto_trade_settings IS 'Brukerens auto-trading innstillinger og risikoprofil';
COMMENT ON TABLE auto_trades IS 'Logg over alle auto-trades';
COMMENT ON TABLE auto_trade_daily_stats IS 'Daglige statistikker for rask risikovurdering';

-- ============================================
-- Seed: Opprett default settings for eksisterende brukere
-- ============================================

INSERT INTO auto_trade_settings (user_id)
SELECT id FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM auto_trade_settings WHERE user_id = auth.users.id
)
ON CONFLICT DO NOTHING;
