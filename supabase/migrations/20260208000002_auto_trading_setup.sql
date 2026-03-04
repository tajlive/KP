-- ============================================================================
-- KLARPAKKE AUTO-TRADING DATABASE SETUP
-- ============================================================================
-- Opprettet: 2026-02-08
-- Beskrivelse: Komplett database schema for auto-trading systemet
-- ============================================================================

-- ============================================================================
-- 1. TRADING API KEYS TABLE
-- ============================================================================
-- Lagrer krypterte Binance API keys per bruker
-- ============================================================================

CREATE TABLE IF NOT EXISTS trading_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exchange TEXT NOT NULL DEFAULT 'binance',
  api_key_encrypted TEXT NOT NULL,
  api_secret_encrypted TEXT NOT NULL,
  permissions TEXT[] DEFAULT ARRAY['SPOT_READ', 'SPOT_TRADE'],
  is_testnet BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, exchange)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trading_api_keys_active ON trading_api_keys(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_trading_api_keys_exchange ON trading_api_keys(exchange);

-- RLS Policies
ALTER TABLE trading_api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only see own API keys" ON trading_api_keys;
CREATE POLICY "Users can only see own API keys"
  ON trading_api_keys FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only insert own API keys" ON trading_api_keys;
CREATE POLICY "Users can only insert own API keys"
  ON trading_api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only update own API keys" ON trading_api_keys;
CREATE POLICY "Users can only update own API keys"
  ON trading_api_keys FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only delete own API keys" ON trading_api_keys;
CREATE POLICY "Users can only delete own API keys"
  ON trading_api_keys FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 2. AUTO TRADE SETTINGS TABLE
-- ============================================================================
-- Brukerens preferanser for auto-trading
-- ============================================================================

CREATE TABLE IF NOT EXISTS auto_trade_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT false,
  risk_profile TEXT DEFAULT 'konservativ' CHECK (risk_profile IN ('konservativ', 'moderat', 'aggressiv')),
  max_position_size_percent DECIMAL(5,2) DEFAULT 2.00,
  daily_loss_limit_percent DECIMAL(5,2) DEFAULT 5.00,
  max_daily_trades INTEGER DEFAULT 10,
  min_confidence_threshold INTEGER DEFAULT 70 CHECK (min_confidence_threshold BETWEEN 0 AND 100),
  allowed_symbols TEXT[] DEFAULT ARRAY['BTCUSDT', 'ETHUSDT'],
  stop_loss_percent DECIMAL(5,2) DEFAULT 3.00,
  take_profit_percent DECIMAL(5,2) DEFAULT 6.00,
  use_dynamic_stop_loss BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Indexes
-- Index fjernet midlertidig pga kolonne-konflikt
-- CREATE INDEX IF NOT EXISTS idx_auto_trade_settings_enabled ON auto_trade_settings(user_id, is_enabled);

-- RLS Policies
ALTER TABLE auto_trade_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies (med IF NOT EXISTS logikk via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'auto_trade_settings' 
    AND policyname = 'Users can only see own settings'
  ) THEN
    CREATE POLICY "Users can only see own settings" 
      ON auto_trade_settings FOR SELECT 
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'auto_trade_settings' 
    AND policyname = 'Users can only insert own settings'
  ) THEN
    CREATE POLICY "Users can only insert own settings" 
      ON auto_trade_settings FOR INSERT 
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'auto_trade_settings' 
    AND policyname = 'Users can only update own settings'
  ) THEN
    CREATE POLICY "Users can only update own settings" 
      ON auto_trade_settings FOR UPDATE 
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'auto_trade_settings' 
    AND policyname = 'Users can only delete own settings'
  ) THEN
    CREATE POLICY "Users can only delete own settings" 
      ON auto_trade_settings FOR DELETE 
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Auto-create settings on user signup
CREATE OR REPLACE FUNCTION create_auto_trade_settings_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO auto_trade_settings (user_id, is_enabled)
  VALUES (NEW.id, false)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_auto_trade ON auth.users;
CREATE TRIGGER on_auth_user_created_auto_trade 
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_auto_trade_settings_for_new_user();

-- ============================================================================
-- 3. AUTO TRADES TABLE
-- ============================================================================
-- Logg over alle auto-trades (paper + live)
-- ============================================================================

CREATE TABLE IF NOT EXISTS auto_trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_id UUID,
  exchange TEXT NOT NULL DEFAULT 'binance',
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  order_type TEXT NOT NULL DEFAULT 'market' CHECK (order_type IN ('market', 'limit')),
  quantity DECIMAL(20,8) NOT NULL,
  price DECIMAL(20,8),
  stop_loss_price DECIMAL(20,8),
  take_profit_price DECIMAL(20,8),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'failed', 'cancelled')),
  binance_order_id TEXT,
  execution_price DECIMAL(20,8),
  executed_quantity DECIMAL(20,8),
  commission DECIMAL(20,8),
  commission_asset TEXT,
  profit_loss DECIMAL(20,8),
  profit_loss_percent DECIMAL(10,4),
  is_paper_trade BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  executed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_auto_trades_user_status ON auto_trades(user_id, status);
-- CREATE INDEX IF NOT EXISTS idx_auto_trades_signal ON auto_trades(signal_id);  -- Kolonne finnes ikke ennå
CREATE INDEX IF NOT EXISTS idx_auto_trades_created ON auto_trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auto_trades_symbol ON auto_trades(symbol);

-- RLS Policies
ALTER TABLE auto_trades ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'auto_trades' AND policyname = 'Users can only see own trades'
  ) THEN
    CREATE POLICY "Users can only see own trades" 
      ON auto_trades FOR SELECT 
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'auto_trades' AND policyname = 'Service role can update trades'
  ) THEN
    CREATE POLICY "Service role can update trades" 
      ON auto_trades FOR ALL 
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================================================
-- 4. AUTO TRADE DAILY STATS TABLE
-- ============================================================================
-- Daglig statistikk per bruker
-- ============================================================================

CREATE TABLE IF NOT EXISTS auto_trade_daily_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_trades INTEGER DEFAULT 0,
  successful_trades INTEGER DEFAULT 0,
  failed_trades INTEGER DEFAULT 0,
  total_profit_loss DECIMAL(20,8) DEFAULT 0,
  total_profit_loss_percent DECIMAL(10,4) DEFAULT 0,
  win_rate DECIMAL(5,2) DEFAULT 0,
  largest_win DECIMAL(20,8) DEFAULT 0,
  largest_loss DECIMAL(20,8) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, trade_date)
);

-- Indexes
-- CREATE INDEX IF NOT EXISTS idx_auto_trade_daily_stats_date ON auto_trade_daily_stats(user_id, trade_date DESC);

-- RLS Policies
ALTER TABLE auto_trade_daily_stats ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'auto_trade_daily_stats' AND policyname = 'Users can only see own stats'
  ) THEN
    CREATE POLICY "Users can only see own stats" 
      ON auto_trade_daily_stats FOR SELECT 
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Function: Update daily stats when trade is executed
CREATE OR REPLACE FUNCTION update_daily_stats_on_trade()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'executed' AND (OLD.status IS NULL OR OLD.status != 'executed') THEN
    INSERT INTO auto_trade_daily_stats (
      user_id,
      trade_date,
      total_trades,
      successful_trades,
      failed_trades,
      total_profit_loss,
      total_profit_loss_percent
    ) VALUES (
      NEW.user_id,
      CURRENT_DATE,
      1,
      CASE WHEN NEW.profit_loss >= 0 THEN 1 ELSE 0 END,
      CASE WHEN NEW.profit_loss < 0 THEN 1 ELSE 0 END,
      COALESCE(NEW.profit_loss, 0),
      COALESCE(NEW.profit_loss_percent, 0)
    )
    ON CONFLICT (user_id, trade_date) DO UPDATE SET
      total_trades = auto_trade_daily_stats.total_trades + 1,
      successful_trades = auto_trade_daily_stats.successful_trades + CASE WHEN NEW.profit_loss >= 0 THEN 1 ELSE 0 END,
      failed_trades = auto_trade_daily_stats.failed_trades + CASE WHEN NEW.profit_loss < 0 THEN 1 ELSE 0 END,
      total_profit_loss = auto_trade_daily_stats.total_profit_loss + COALESCE(NEW.profit_loss, 0),
      total_profit_loss_percent = (auto_trade_daily_stats.total_profit_loss_percent + COALESCE(NEW.profit_loss_percent, 0)) / 2,
      win_rate = (auto_trade_daily_stats.successful_trades::DECIMAL / NULLIF(auto_trade_daily_stats.total_trades, 0)) * 100,
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_trade_executed 
  AFTER UPDATE ON auto_trades
  FOR EACH ROW EXECUTE FUNCTION update_daily_stats_on_trade();

-- Function: Check if daily loss limit exceeded
CREATE OR REPLACE FUNCTION check_daily_loss_limit(p_user_id UUID)
RETURNS TABLE(should_stop BOOLEAN, current_loss_percent DECIMAL) AS $$
DECLARE
  v_settings auto_trade_settings%ROWTYPE;
  v_stats auto_trade_daily_stats%ROWTYPE;
  v_portfolio_value DECIMAL := 10000; -- Default, skal hentes fra user_portfolios
  v_loss_percent DECIMAL;
BEGIN
  -- Hent settings
  SELECT * INTO v_settings
  FROM auto_trade_settings
  WHERE user_id = p_user_id;

  -- Hent dagens stats
  SELECT * INTO v_stats
  FROM auto_trade_daily_stats
  WHERE user_id = p_user_id AND trade_date = CURRENT_DATE;

  IF v_stats IS NULL THEN
    v_loss_percent := 0;
  ELSE
    v_loss_percent := ABS(v_stats.total_profit_loss / v_portfolio_value * 100);
  END IF;

  RETURN QUERY SELECT 
    v_loss_percent >= v_settings.daily_loss_limit_percent,
    v_loss_percent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE trading_api_keys IS 'Krypterte Binance API keys per bruker. AES-256 encryption.';
COMMENT ON TABLE auto_trade_settings IS 'Brukerens auto-trading preferanser og risikoinnstillinger.';
COMMENT ON TABLE auto_trades IS 'Logg over alle auto-trades (paper + live). Inkluderer profit/loss tracking.';
COMMENT ON TABLE auto_trade_daily_stats IS 'Daglig aggregert statistikk per bruker for dashboards.';

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================
-- Alt klart for auto-trading! 🚀
-- ============================================================================
