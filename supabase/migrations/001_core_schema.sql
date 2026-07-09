-- ============================================================================
-- KLARPAKKE CORE SCHEMA - KLA-53 CANONICAL VERSION
-- ============================================================================
-- This is the SINGLE SOURCE OF TRUTH for all trading-related tables.
-- 
-- Architecture: HYBRID EVENT SOURCING
-- - Append-only `trades` table (immutable event log)
-- - Mutable `trading_sessions` table for hot state
-- - Sessions can be reconstructed from trades if needed
--
-- History:
-- - 2026-03-01: Consolidated from 3 parallel systems (KLA-53)
-- - Merged: user_strategies/trades/user_portfolios + auto_trading_* + paper_*
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================
DO $$
BEGIN
  -- Drop and recreate enums if they exist (for clean slate)
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_tier') THEN
    -- Can't drop if used, so we just ensure values are correct
    NULL;
  ELSE
    CREATE TYPE subscription_tier AS ENUM ('free', 'bachelor', 'master', 'phd', 'professor');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trading_mode') THEN
    CREATE TYPE trading_mode AS ENUM ('paper', 'live');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_status') THEN
    CREATE TYPE session_status AS ENUM ('active', 'paused', 'crashed', 'stopped');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trade_side') THEN
    CREATE TYPE trade_side AS ENUM ('buy', 'sell');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trade_status') THEN
    CREATE TYPE trade_status AS ENUM ('pending', 'filled', 'partially_filled', 'cancelled', 'failed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_type') THEN
    CREATE TYPE order_type AS ENUM ('market', 'limit', 'stop_loss', 'take_profit');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trading_phase') THEN
    CREATE TYPE trading_phase AS ENUM ('paper', 'micro', 'small', 'full');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_level') THEN
    CREATE TYPE risk_level AS ENUM ('conservative', 'balanced', 'aggressive');
  END IF;
END $$;
-- ============================================================================
-- 2. USER PROFILES (extends Supabase auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT NOT NULL DEFAULT 'Trader',
  avatar_url      TEXT,
  tier            subscription_tier NOT NULL DEFAULT 'free',
  tier_expires_at TIMESTAMPTZ,
  
  -- Paper trading capital
  paper_balance   NUMERIC(15,2) NOT NULL DEFAULT 100000.00,
  
  -- Binance integration status
  binance_connected BOOLEAN NOT NULL DEFAULT false,
  binance_api_key_encrypted TEXT,
  binance_api_secret_encrypted TEXT,
  
  -- Notification preferences
  email_on_trade     BOOLEAN NOT NULL DEFAULT true,
  email_on_crash     BOOLEAN NOT NULL DEFAULT true,
  email_daily_digest BOOLEAN NOT NULL DEFAULT true,
  
  -- Risk preferences
  default_risk_level risk_level DEFAULT 'balanced',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Trader')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
-- ============================================================================
-- 3. TRADING SESSIONS (mutable hot state)
-- ============================================================================
CREATE TABLE IF NOT EXISTS trading_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode            trading_mode NOT NULL DEFAULT 'paper',
  status          session_status NOT NULL DEFAULT 'active',
  
  -- Strategy configuration (immutable after creation)
  strategy_id     TEXT NOT NULL DEFAULT 'dca',           -- e.g., 'dca', 'trend_follow', 'grid'
  strategy_config JSONB NOT NULL DEFAULT '{}',           -- Strategy-specific params
  trading_pair    TEXT NOT NULL DEFAULT 'BTC/USDT',
  risk_level      risk_level DEFAULT 'balanced',
  
  -- Mutable state (updated atomically with each trade)
  current_capital NUMERIC(15,2) NOT NULL DEFAULT 100000.00,
  initial_capital NUMERIC(15,2) NOT NULL DEFAULT 100000.00,
  open_position   JSONB,                   -- Current open position or null
  total_trades    INTEGER NOT NULL DEFAULT 0,
  winning_trades  INTEGER NOT NULL DEFAULT 0,
  losing_trades   INTEGER NOT NULL DEFAULT 0,
  total_pnl       NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  max_drawdown_pct NUMERIC(5,2) DEFAULT 0.00,
  
  -- Phase progression (paper → micro → small → full)
  phase           trading_phase DEFAULT 'paper',
  phase_started_at TIMESTAMPTZ DEFAULT now(),
  
  -- Crash recovery
  last_heartbeat  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_tick_at    TIMESTAMPTZ,
  crash_count     INTEGER NOT NULL DEFAULT 0,
  
  -- Lifecycle
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  stopped_at      TIMESTAMPTZ,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Prevent duplicate active sessions per user+pair
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_session 
  ON trading_sessions (user_id, trading_pair)
  WHERE status = 'active';
-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_sessions_heartbeat 
  ON trading_sessions (last_heartbeat)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_sessions_user 
  ON trading_sessions (user_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_user_mode 
  ON trading_sessions (user_id, mode);
-- ============================================================================
-- 4. TRADES (append-only event log - NEVER update or delete)
-- ============================================================================
CREATE TABLE IF NOT EXISTS trades (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES trading_sessions(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  
  -- Idempotency: prevents duplicate trades from retries
  idempotency_key TEXT NOT NULL,
  
  -- Trade details
  mode            trading_mode NOT NULL,
  trading_pair    TEXT NOT NULL,
  side            trade_side NOT NULL,
  order_type      order_type NOT NULL DEFAULT 'market',
  
  -- Quantities (NUMERIC for precision)
  quantity        NUMERIC(18,8) NOT NULL,
  price           NUMERIC(18,8) NOT NULL,
  total_value     NUMERIC(15,2) NOT NULL,
  fee             NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  
  -- Status tracking
  status          trade_status NOT NULL DEFAULT 'filled',
  
  -- Copy-trading linkage
  leader_trade_id UUID REFERENCES trades(id),
  is_copy         BOOLEAN NOT NULL DEFAULT false,
  
  -- Exchange integration
  binance_order_id TEXT,
  
  -- PnL (calculated at trade time for sells)
  realized_pnl    NUMERIC(15,2),
  
  -- Metadata
  strategy_signal JSONB,
  
  executed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- CRITICAL: Idempotency constraint prevents duplicate trades
CREATE UNIQUE INDEX IF NOT EXISTS idx_trades_idempotency ON trades (idempotency_key);
-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_trades_session ON trades (session_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_user ON trades (user_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_user_mode ON trades (user_id, mode, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_leader ON trades (leader_trade_id) WHERE leader_trade_id IS NOT NULL;
-- ============================================================================
-- 5. COPY-TRADING RELATIONSHIPS
-- ============================================================================
CREATE TABLE IF NOT EXISTS copy_trading_follows (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leader_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Config
  is_active     BOOLEAN NOT NULL DEFAULT true,
  scale_factor  NUMERIC(5,4) NOT NULL DEFAULT 1.0000,
  max_trade_size NUMERIC(15,2),
  
  -- Stats
  total_copied_trades INTEGER NOT NULL DEFAULT 0,
  total_pnl          NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Can't follow yourself
  CONSTRAINT no_self_follow CHECK (follower_id != leader_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_follow_unique ON copy_trading_follows (follower_id, leader_id);
CREATE INDEX IF NOT EXISTS idx_follow_leader ON copy_trading_follows (leader_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_follow_follower ON copy_trading_follows (follower_id) WHERE is_active = true;
-- ============================================================================
-- 6. COPY-TRADE QUEUE (fan-out buffer)
-- ============================================================================
CREATE TABLE IF NOT EXISTS copy_trade_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_trade_id UUID NOT NULL REFERENCES trades(id),
  follower_id     UUID NOT NULL REFERENCES auth.users(id),
  follow_id       UUID NOT NULL REFERENCES copy_trading_follows(id),
  
  -- Pre-calculated trade details
  trading_pair    TEXT NOT NULL,
  side            trade_side NOT NULL,
  quantity        NUMERIC(18,8) NOT NULL,
  price           NUMERIC(18,8) NOT NULL,
  mode            trading_mode NOT NULL,
  
  -- Processing state
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  attempts        INTEGER NOT NULL DEFAULT 0,
  error_message   TEXT,
  processed_at    TIMESTAMPTZ,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_copy_queue_pending ON copy_trade_queue (created_at) WHERE status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS idx_copy_queue_unique ON copy_trade_queue (leader_trade_id, follower_id);
-- ============================================================================
-- 7. NOTIFICATION QUEUE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_queue (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  type        TEXT NOT NULL CHECK (type IN (
    'trade_executed', 'bot_crashed', 'bot_recovered', 
    'copy_started', 'daily_digest', 'subscription_change'
  )),
  payload     JSONB NOT NULL DEFAULT '{}',
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  attempts    INTEGER NOT NULL DEFAULT 0,
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_pending ON notification_queue (created_at) WHERE status = 'pending';
-- ============================================================================
-- 8. LEADERBOARD VIEW
-- ============================================================================
DROP MATERIALIZED VIEW IF EXISTS leaderboard;
CREATE MATERIALIZED VIEW leaderboard AS
SELECT 
  up.id AS user_id,
  up.display_name,
  up.avatar_url,
  COUNT(t.id) AS total_trades,
  SUM(CASE WHEN t.realized_pnl > 0 THEN 1 ELSE 0 END) AS winning_trades,
  COALESCE(SUM(t.realized_pnl), 0) AS total_pnl,
  CASE 
    WHEN COUNT(t.id) > 0 
    THEN ROUND(
      SUM(CASE WHEN t.realized_pnl > 0 THEN 1 ELSE 0 END)::NUMERIC 
      / COUNT(t.id) * 100, 1
    )
    ELSE 0 
  END AS win_rate,
  CASE 
    WHEN MAX(ts.initial_capital) > 0 
    THEN ROUND(COALESCE(SUM(t.realized_pnl), 0) / MAX(ts.initial_capital) * 100, 2)
    ELSE 0 
  END AS roi_percent,
  (SELECT COUNT(*) FROM copy_trading_follows cf 
   WHERE cf.leader_id = up.id AND cf.is_active = true) AS follower_count,
  MAX(t.executed_at) AS last_trade_at
FROM user_profiles up
LEFT JOIN trades t ON t.user_id = up.id AND t.mode = 'paper' AND t.status = 'filled'
LEFT JOIN trading_sessions ts ON ts.user_id = up.id
WHERE t.executed_at > now() - INTERVAL '30 days'
GROUP BY up.id, up.display_name, up.avatar_url
HAVING COUNT(t.id) >= 5
ORDER BY total_pnl DESC;
CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_user ON leaderboard (user_id);
-- Refresh leaderboard every minute
DO $$
BEGIN
  PERFORM cron.unschedule('refresh-leaderboard');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not unschedule refresh-leaderboard (job may not exist): %', SQLERRM;
END $$;
SELECT cron.schedule(
  'refresh-leaderboard',
  '* * * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard$$
);
-- ============================================================================
-- 9. DATABASE TRIGGERS
-- ============================================================================

-- Trigger: Update session state after trade
CREATE OR REPLACE FUNCTION trigger_update_session_state()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE trading_sessions
  SET 
    current_capital = CASE
      WHEN NEW.side = 'buy' THEN current_capital - NEW.total_value - NEW.fee
      WHEN NEW.side = 'sell' THEN current_capital + NEW.total_value - NEW.fee
      ELSE current_capital
    END,
    open_position = CASE
      WHEN NEW.side = 'buy' THEN jsonb_build_object(
        'side', 'long',
        'quantity', NEW.quantity,
        'entry_price', NEW.price,
        'entry_time', NEW.executed_at
      )
      WHEN NEW.side = 'sell' THEN NULL
      ELSE open_position
    END,
    total_trades = total_trades + 1,
    winning_trades = CASE
      WHEN NEW.realized_pnl > 0 THEN winning_trades + 1
      ELSE winning_trades
    END,
    losing_trades = CASE
      WHEN NEW.realized_pnl < 0 THEN losing_trades + 1
      ELSE losing_trades
    END,
    total_pnl = total_pnl + COALESCE(NEW.realized_pnl, 0),
    last_tick_at = now(),
    updated_at = now()
  WHERE id = NEW.session_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_trade_update_session ON trades;
CREATE TRIGGER on_trade_update_session
  AFTER INSERT ON trades
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_session_state();
-- Trigger: Trade notification
CREATE OR REPLACE FUNCTION trigger_trade_notification()
RETURNS TRIGGER AS $$
DECLARE
  should_notify BOOLEAN;
BEGIN
  SELECT email_on_trade INTO should_notify
  FROM user_profiles WHERE id = NEW.user_id;

  IF should_notify THEN
    INSERT INTO notification_queue (user_id, type, payload)
    VALUES (NEW.user_id, 'trade_executed', jsonb_build_object(
      'trade_id', NEW.id,
      'side', NEW.side,
      'quantity', NEW.quantity,
      'price', NEW.price,
      'trading_pair', NEW.trading_pair,
      'is_copy', NEW.is_copy,
      'realized_pnl', NEW.realized_pnl
    ));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_trade_notify ON trades;
CREATE TRIGGER on_trade_notify
  AFTER INSERT ON trades
  FOR EACH ROW
  EXECUTE FUNCTION trigger_trade_notification();
-- ============================================================================
-- 10. CRASH DETECTION CRON
-- ============================================================================
DO $$
BEGIN
  PERFORM cron.unschedule('detect-crashed-sessions');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not unschedule detect-crashed-sessions (job may not exist): %', SQLERRM;
END $$;
SELECT cron.schedule(
  'detect-crashed-sessions',
  '* * * * *',
  $$
    WITH crashed AS (
      UPDATE trading_sessions
      SET status = 'crashed', updated_at = now()
      WHERE status = 'active'
        AND last_heartbeat < now() - INTERVAL '5 minutes'
      RETURNING id, user_id
    )
    INSERT INTO notification_queue (user_id, type, payload)
    SELECT user_id, 'bot_crashed', jsonb_build_object('session_id', id)
    FROM crashed;
  $$
);
-- ============================================================================
-- 11. ROW LEVEL SECURITY
-- ============================================================================

-- user_profiles: own profile only
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users update own profile" ON user_profiles;
CREATE POLICY "Users read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);
-- trading_sessions: own sessions only
ALTER TABLE trading_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own sessions" ON trading_sessions;
CREATE POLICY "Users manage own sessions" ON trading_sessions
  FOR ALL USING (auth.uid() = user_id);
-- trades: own trades only
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own trades" ON trades;
DROP POLICY IF EXISTS "Service role full access" ON trades;
CREATE POLICY "Users see own trades" ON trades
  FOR ALL USING (auth.uid() = user_id);
-- Service role bypass for API routes
CREATE POLICY "Service role full access" ON trades
  FOR ALL USING (auth.role() = 'service_role');
-- copy_trading_follows
ALTER TABLE copy_trading_follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own follows" ON copy_trading_follows;
DROP POLICY IF EXISTS "Users manage own follows" ON copy_trading_follows;
CREATE POLICY "Users see own follows" ON copy_trading_follows
  FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = leader_id);
CREATE POLICY "Users manage own follows" ON copy_trading_follows
  FOR ALL USING (auth.uid() = follower_id);
-- notification_queue
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own notifications" ON notification_queue;
CREATE POLICY "Users see own notifications" ON notification_queue
  FOR ALL USING (auth.uid() = user_id);
-- copy_trade_queue: service role only
ALTER TABLE copy_trade_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role processes queue" ON copy_trade_queue;
CREATE POLICY "Service role processes queue" ON copy_trade_queue
  FOR ALL USING (auth.role() = 'service_role');
-- leaderboard: public read (grant to authenticated)
GRANT SELECT ON leaderboard TO authenticated;
GRANT SELECT ON leaderboard TO anon;
-- ============================================================================
-- 12. HELPER FUNCTIONS
-- ============================================================================

-- Generate idempotency key for trades
CREATE OR REPLACE FUNCTION generate_trade_idempotency_key(
  p_session_id UUID,
  p_side trade_side,
  p_timestamp TIMESTAMPTZ DEFAULT now()
) RETURNS TEXT AS $$
BEGIN
  RETURN p_session_id || '-' || p_side || '-' || to_char(p_timestamp, 'YYYYMMDD-HH24MISS-MS');
END;
$$ LANGUAGE plpgsql;
-- Check if user can follow more leaders (based on tier)
CREATE OR REPLACE FUNCTION can_follow_leader(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_tier subscription_tier;
  current_follows INTEGER;
  max_follows INTEGER;
BEGIN
  SELECT tier INTO user_tier FROM user_profiles WHERE id = p_user_id;
  SELECT COUNT(*) INTO current_follows FROM copy_trading_follows
    WHERE follower_id = p_user_id AND is_active = true;

  max_follows := CASE user_tier
    WHEN 'free' THEN 0
    WHEN 'bachelor' THEN 1
    WHEN 'master' THEN 3
    WHEN 'phd' THEN 999
    WHEN 'professor' THEN 999
    ELSE 0
  END;

  RETURN current_follows < max_follows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================================================
-- 13. BACKWARD COMPATIBILITY VIEWS (for smooth migration)
-- ============================================================================

-- Legacy paper_trades view (redirects to trades)
DROP VIEW IF EXISTS paper_trades_compat;
CREATE VIEW paper_trades_compat AS
SELECT 
  t.id,
  t.session_id as simulation_id,
  t.created_at,
  t.created_at as updated_at,
  t.trading_pair as symbol,
  CASE WHEN t.side = 'buy' THEN 'LONG' ELSE 'SHORT' END as side,
  t.price as entry_price,
  NULL::numeric as exit_price,
  t.quantity,
  t.total_value as position_value,
  1.00 as leverage,
  NULL::numeric as stop_loss,
  NULL::numeric as take_profit,
  t.realized_pnl as pnl,
  CASE WHEN t.realized_pnl > 0 THEN (t.realized_pnl / NULLIF(t.total_value, 0) * 100) ELSE 0 END as pnl_pct,
  CASE 
    WHEN t.status = 'filled' AND t.realized_pnl IS NULL THEN 'OPEN'
    WHEN t.realized_pnl IS NOT NULL THEN 'CLOSED'
    ELSE t.status::text
  END as status,
  t.executed_at as opened_at,
  NULL::timestamptz as closed_at,
  NULL::text as close_reason
FROM trades t
WHERE t.mode = 'paper';
-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'KLA-53 CORE SCHEMA INSTALLED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - user_profiles';
  RAISE NOTICE '  - trading_sessions';
  RAISE NOTICE '  - trades';
  RAISE NOTICE '  - copy_trading_follows';
  RAISE NOTICE '  - copy_trade_queue';
  RAISE NOTICE '  - notification_queue';
  RAISE NOTICE '  - leaderboard (materialized view)';
  RAISE NOTICE '========================================';
END $$;
