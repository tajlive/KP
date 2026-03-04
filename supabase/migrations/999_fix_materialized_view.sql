-- ============================================================================
-- MIGRATION: Fiks trading tables (idempotent - kan kjøres flere ganger)
-- ============================================================================

-- 1. DROP leaderboard (hvis finnes)
DROP TABLE IF EXISTS leaderboard CASCADE;

-- 2. USER_PROFILES - Legg til manglende kolonner hvis tabellen eksisterer
DO $$
BEGIN
  -- Sjekk om tabellen eksisterer
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    -- Legg til manglende kolonner
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'paper_balance') THEN
      ALTER TABLE user_profiles ADD COLUMN paper_balance NUMERIC(15,2) NOT NULL DEFAULT 1000000.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'binance_connected') THEN
      ALTER TABLE user_profiles ADD COLUMN binance_connected BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'email_on_trade') THEN
      ALTER TABLE user_profiles ADD COLUMN email_on_trade BOOLEAN NOT NULL DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'email_on_crash') THEN
      ALTER TABLE user_profiles ADD COLUMN email_on_crash BOOLEAN NOT NULL DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'email_daily_digest') THEN
      ALTER TABLE user_profiles ADD COLUMN email_daily_digest BOOLEAN NOT NULL DEFAULT true;
    END IF;
  ELSE
    -- Opprett tabellen
    CREATE TABLE user_profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      display_name TEXT NOT NULL DEFAULT 'Trader',
      avatar_url TEXT,
      tier TEXT NOT NULL DEFAULT 'free',
      tier_expires_at TIMESTAMPTZ,
      paper_balance NUMERIC(15,2) NOT NULL DEFAULT 1000000.00,
      binance_connected BOOLEAN NOT NULL DEFAULT false,
      email_on_trade BOOLEAN NOT NULL DEFAULT true,
      email_on_crash BOOLEAN NOT NULL DEFAULT true,
      email_daily_digest BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  END IF;
END $$;

-- 3. TRADING_SESSIONS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trading_sessions') THEN
    CREATE TABLE trading_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      mode TEXT NOT NULL DEFAULT 'paper',
      status TEXT NOT NULL DEFAULT 'active',
      strategy_id TEXT NOT NULL,
      strategy_config JSONB NOT NULL DEFAULT '{}',
      trading_pair TEXT NOT NULL DEFAULT 'BTCUSDT',
      current_capital NUMERIC(15,2) NOT NULL,
      initial_capital NUMERIC(15,2) NOT NULL,
      open_position JSONB,
      total_trades INTEGER NOT NULL DEFAULT 0,
      winning_trades INTEGER NOT NULL DEFAULT 0,
      total_pnl NUMERIC(15,2) NOT NULL DEFAULT 0.00,
      last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_tick_at TIMESTAMPTZ,
      crash_count INTEGER NOT NULL DEFAULT 0,
      started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      stopped_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    
    CREATE UNIQUE INDEX idx_unique_active_session ON trading_sessions (user_id, trading_pair) WHERE status = 'active';
  END IF;
END $$;

-- 4. TRADES
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trades') THEN
    CREATE TABLE trades (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL REFERENCES trading_sessions(id),
      user_id UUID NOT NULL REFERENCES auth.users(id),
      idempotency_key TEXT NOT NULL,
      mode TEXT NOT NULL,
      trading_pair TEXT NOT NULL,
      side TEXT NOT NULL,
      order_type TEXT NOT NULL DEFAULT 'market',
      quantity NUMERIC(18,8) NOT NULL,
      price NUMERIC(18,8) NOT NULL,
      total_value NUMERIC(15,2) NOT NULL,
      fee NUMERIC(15,2) NOT NULL DEFAULT 0.00,
      status TEXT NOT NULL DEFAULT 'filled',
      leader_trade_id UUID REFERENCES trades(id),
      is_copy BOOLEAN NOT NULL DEFAULT false,
      binance_order_id TEXT,
      realized_pnl NUMERIC(15,2),
      strategy_signal JSONB,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    
    CREATE UNIQUE INDEX idx_trades_idempotency ON trades (idempotency_key);
    CREATE INDEX idx_trades_session ON trades (session_id, executed_at DESC);
    CREATE INDEX idx_trades_user ON trades (user_id, executed_at DESC);
  END IF;
END $$;

-- 5. COPY_TRADING_FOLLOWS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'copy_trading_follows') THEN
    CREATE TABLE copy_trading_follows (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      leader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      is_active BOOLEAN NOT NULL DEFAULT true,
      scale_factor NUMERIC(5,4) NOT NULL DEFAULT 1.0000,
      max_trade_size NUMERIC(15,2),
      total_copied_trades INTEGER NOT NULL DEFAULT 0,
      total_pnl NUMERIC(15,2) NOT NULL DEFAULT 0.00,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT no_self_follow CHECK (follower_id != leader_id)
    );
    
    CREATE UNIQUE INDEX idx_follow_unique ON copy_trading_follows (follower_id, leader_id);
  END IF;
END $$;

-- 6. COPY_TRADE_QUEUE
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'copy_trade_queue') THEN
    CREATE TABLE copy_trade_queue (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      leader_trade_id UUID NOT NULL REFERENCES trades(id),
      follower_id UUID NOT NULL REFERENCES auth.users(id),
      follow_id UUID NOT NULL REFERENCES copy_trading_follows(id),
      trading_pair TEXT NOT NULL,
      side TEXT NOT NULL,
      quantity NUMERIC(18,8) NOT NULL,
      price NUMERIC(18,8) NOT NULL,
      mode TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      processed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    
    CREATE INDEX idx_copy_queue_pending ON copy_trade_queue (created_at) WHERE status = 'pending';
  END IF;
END $$;

-- 7. NOTIFICATION_QUEUE - Fiks: Legg til status kolonne hvis den mangler
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_queue') THEN
    -- Sjekk om status kolonne mangler
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_queue' AND column_name = 'status') THEN
      ALTER TABLE notification_queue ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
    END IF;
    -- Sjekk om attempts kolonne mangler
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_queue' AND column_name = 'attempts') THEN
      ALTER TABLE notification_queue ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
    END IF;
    -- Sjekk om sent_at kolonne mangler
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_queue' AND column_name = 'sent_at') THEN
      ALTER TABLE notification_queue ADD COLUMN sent_at TIMESTAMPTZ;
    END IF;
  ELSE
    -- Opprett tabellen fra bunnen
    CREATE TABLE notification_queue (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id),
      type TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  END IF;
END $$;

-- Opprett index etter at kolonnen er sikret
CREATE INDEX IF NOT EXISTS idx_notifications_pending ON notification_queue (created_at) WHERE status = 'pending';

-- 8. AKTIVÉR RLS PÅ ALLE TABELLER
DO $$
BEGIN
  ALTER TABLE IF EXISTS user_profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS trading_sessions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS trades ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS copy_trading_follows ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS notification_queue ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS copy_trade_queue ENABLE ROW LEVEL SECURITY;
END $$;

-- 9. RLS POLICIES
DROP POLICY IF EXISTS "Users read own profile" ON user_profiles;
CREATE POLICY "Users read own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON user_profiles;
CREATE POLICY "Users update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users manage own sessions" ON trading_sessions;
CREATE POLICY "Users manage own sessions" ON trading_sessions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users see own trades" ON trades;
CREATE POLICY "Users see own trades" ON trades FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users see own follows" ON copy_trading_follows;
CREATE POLICY "Users see own follows" ON copy_trading_follows FOR SELECT 
  USING (auth.uid() = follower_id OR auth.uid() = leader_id);

DROP POLICY IF EXISTS "Users manage own follows" ON copy_trading_follows;
CREATE POLICY "Users manage own follows" ON copy_trading_follows FOR ALL 
  USING (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users see own notifications" ON notification_queue;
CREATE POLICY "Users see own notifications" ON notification_queue FOR SELECT 
  USING (auth.uid() = user_id);

-- 10. VERIFISER
SELECT 'Migration fullført!' as status;
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
ORDER BY table_name;
