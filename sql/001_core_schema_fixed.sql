-- ============================================================================
-- FIX: Drop existing triggers/functions first
-- ============================================================================

-- Drop existing auth trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Drop existing triggers on trades
DROP TRIGGER IF EXISTS on_trade_inserted ON trades;
DROP TRIGGER IF EXISTS on_trade_update_session ON trades;
DROP TRIGGER IF EXISTS on_trade_notify ON trades;

-- Drop existing functions
DROP FUNCTION IF EXISTS trigger_copy_trade_fanout();
DROP FUNCTION IF EXISTS trigger_update_session_state();
DROP FUNCTION IF EXISTS trigger_trade_notification();

-- ============================================================================
-- ORIGINAL SCHEMA
-- ============================================================================

-- ============================================================================
-- KLARPAKKE TRADING PLATFORM - CORE DATABASE SCHEMA
-- ============================================================================
-- Architecture Decision: HYBRID EVENT SOURCING
-- 
-- Why not pure CRUD?
--   - No audit trail → can't reconstruct state after crash
--   - No copy-trading trigger source → need reliable event stream
--   - No replay capability → debugging production issues impossible
--
-- Why not pure Event Sourcing?
--   - Overkill for MVP with 10K trades/day
--   - Materialized views add complexity without clear benefit at this scale
--   - Supabase free tier (500MB) can't afford storing every intermediate event
--
-- HYBRID: Append-only `trades` table (immutable event log) + mutable `sessions`
-- table for hot state. Sessions can be reconstructed from trades if needed.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";      -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgsodium";       -- Encryption for API keys
CREATE EXTENSION IF NOT EXISTS "pg_cron";        -- Scheduled jobs

-- ============================================================================
-- 1. SUBSCRIPTION TIERS (drives all access control)
-- ============================================================================
CREATE TYPE subscription_tier AS ENUM (
  'free',        -- Paper trading only
  'bachelor',    -- 249 NOK/month: Copy 1 leader
  'master',      -- 499 NOK/month: Copy up to 3 leaders
  'phd',         -- 999 NOK/month: Unlimited copy + live trading
  'professor'    -- 1999 NOK/month: Priority everything
);

CREATE TYPE trading_mode AS ENUM ('paper', 'live');
CREATE TYPE session_status AS ENUM ('active', 'paused', 'crashed', 'stopped');
CREATE TYPE trade_side AS ENUM ('buy', 'sell');
CREATE TYPE trade_status AS ENUM ('pending', 'filled', 'partially_filled', 'cancelled', 'failed');
CREATE TYPE order_type AS ENUM ('market', 'limit', 'stop_loss', 'take_profit');

-- ============================================================================
-- 2. USER PROFILES (extends Supabase auth.users)
-- ============================================================================
CREATE TABLE user_profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT NOT NULL DEFAULT 'Trader',
  avatar_url      TEXT,
  tier            subscription_tier NOT NULL DEFAULT 'free',
  tier_expires_at TIMESTAMPTZ,
  
  -- Paper trading capital
  paper_balance   NUMERIC(15,2) NOT NULL DEFAULT 1000000.00,  -- 1M NOK start
  
  -- Binance integration (encrypted via Supabase Vault)
  binance_api_key_id    UUID REFERENCES vault.secrets(id),
  binance_api_secret_id UUID REFERENCES vault.secrets(id),
  binance_connected     BOOLEAN NOT NULL DEFAULT false,
  
  -- Notification preferences
  email_on_trade     BOOLEAN NOT NULL DEFAULT true,
  email_on_crash     BOOLEAN NOT NULL DEFAULT true,
  email_daily_digest BOOLEAN NOT NULL DEFAULT true,
  
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
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- 3. TRADING SESSIONS (mutable hot state)
-- ============================================================================
-- A session represents one "bot run". When user clicks Start, we create a session.
-- The session holds current state that changes with every trade.
-- If we need to reconstruct, we replay trades for this session_id.
CREATE TABLE trading_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode            trading_mode NOT NULL DEFAULT 'paper',
  status          session_status NOT NULL DEFAULT 'active',
  
  -- Strategy configuration (immutable after creation)
  strategy_id     TEXT NOT NULL,           -- e.g., 'dca', 'trend_follow', 'grid'
  strategy_config JSONB NOT NULL DEFAULT '{}',  -- Strategy-specific params
  trading_pair    TEXT NOT NULL DEFAULT 'BTC/USDT',
  
  -- Mutable state (updated atomically with each trade)
  current_capital NUMERIC(15,2) NOT NULL,  -- Available capital
  initial_capital NUMERIC(15,2) NOT NULL,  -- Starting capital (for PnL calc)
  open_position   JSONB,                   -- Current open position or null
  total_trades    INTEGER NOT NULL DEFAULT 0,
  winning_trades  INTEGER NOT NULL DEFAULT 0,
  total_pnl       NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  
  -- Crash recovery
  last_heartbeat  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_tick_at    TIMESTAMPTZ,             -- Last time strategy logic ran
  crash_count     INTEGER NOT NULL DEFAULT 0,
  
  -- Lifecycle
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  stopped_at      TIMESTAMPTZ,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent duplicate active sessions per user+pair
CREATE UNIQUE INDEX idx_unique_active_session 
  ON trading_sessions (user_id, trading_pair)
  WHERE status = 'active';

-- Fast lookup for crash recovery cron
CREATE INDEX idx_sessions_heartbeat 
  ON trading_sessions (last_heartbeat)
  WHERE status = 'active';

-- Fast lookup for user's sessions
CREATE INDEX idx_sessions_user 
  ON trading_sessions (user_id, status);

-- ============================================================================
-- 4. TRADES (append-only event log - NEVER update or delete)
-- ============================================================================
-- This is our source of truth. Every trade is immutable.
-- If a trade needs correction, insert a new offsetting trade.
CREATE TABLE trades (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES trading_sessions(id),
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  
  -- Idempotency: prevents duplicate trades from retries, button spam, copy-trade races
  idempotency_key TEXT NOT NULL,
  
  -- Trade details
  mode            trading_mode NOT NULL,
  trading_pair    TEXT NOT NULL,
  side            trade_side NOT NULL,
  order_type      order_type NOT NULL DEFAULT 'market',
  
  -- Quantities (NUMERIC for precision)
  quantity        NUMERIC(18,8) NOT NULL,    -- Amount of base asset
  price           NUMERIC(18,8) NOT NULL,    -- Execution price
  total_value     NUMERIC(15,2) NOT NULL,    -- quantity * price in quote currency
  fee             NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  
  -- Status tracking
  status          trade_status NOT NULL DEFAULT 'filled',
  
  -- Copy-trading linkage
  leader_trade_id UUID REFERENCES trades(id),  -- If this is a copied trade
  is_copy         BOOLEAN NOT NULL DEFAULT false,
  
  -- Binance integration (for live trades)
  binance_order_id TEXT,
  
  -- PnL (calculated at trade time for sells)
  realized_pnl    NUMERIC(15,2),
  
  -- Metadata
  strategy_signal JSONB,  -- What indicators triggered this trade
  
  executed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CRITICAL: Idempotency constraint prevents duplicate trades
CREATE UNIQUE INDEX idx_trades_idempotency ON trades (idempotency_key);

-- Fast queries for session trade history
CREATE INDEX idx_trades_session ON trades (session_id, executed_at DESC);

-- Fast queries for user trade history
CREATE INDEX idx_trades_user ON trades (user_id, executed_at DESC);

-- Copy-trading: find all copies of a leader's trade
CREATE INDEX idx_trades_leader ON trades (leader_trade_id) WHERE leader_trade_id IS NOT NULL;

-- Leaderboard aggregation
CREATE INDEX idx_trades_leaderboard ON trades (user_id, mode, executed_at);

-- ============================================================================
-- 5. COPY-TRADING RELATIONSHIPS
-- ============================================================================
CREATE TABLE copy_trading_follows (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leader_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Config
  is_active     BOOLEAN NOT NULL DEFAULT true,
  scale_factor  NUMERIC(5,4) NOT NULL DEFAULT 1.0000,  -- Follower allocation ratio
  max_trade_size NUMERIC(15,2),  -- Optional cap on single trade size
  
  -- Stats
  total_copied_trades INTEGER NOT NULL DEFAULT 0,
  total_pnl          NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Can't follow yourself
  CONSTRAINT no_self_follow CHECK (follower_id != leader_id)
);

-- One follower can only follow a leader once
CREATE UNIQUE INDEX idx_follow_unique ON copy_trading_follows (follower_id, leader_id);

-- Fast lookup: who is following this leader?
CREATE INDEX idx_follow_leader ON copy_trading_follows (leader_id) WHERE is_active = true;

-- Fast lookup: who is this user following?
CREATE INDEX idx_follow_follower ON copy_trading_follows (follower_id) WHERE is_active = true;

-- ============================================================================
-- 6. COPY-TRADE QUEUE (fan-out buffer for reliable delivery)
-- ============================================================================
-- When a leader trades, we insert one row per follower into this queue.
-- A Supabase Edge Function processes the queue and executes follower trades.
-- This decouples leader execution from follower execution.
CREATE TABLE copy_trade_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_trade_id UUID NOT NULL REFERENCES trades(id),
  follower_id     UUID NOT NULL REFERENCES auth.users(id),
  follow_id       UUID NOT NULL REFERENCES copy_trading_follows(id),
  
  -- Pre-calculated trade details for the follower
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

-- Process pending items efficiently
CREATE INDEX idx_copy_queue_pending 
  ON copy_trade_queue (created_at)
  WHERE status = 'pending';

-- Prevent duplicate queue entries
CREATE UNIQUE INDEX idx_copy_queue_unique 
  ON copy_trade_queue (leader_trade_id, follower_id);

-- ============================================================================
-- 7. NOTIFICATION QUEUE (for Resend email delivery)
-- ============================================================================
CREATE TABLE notification_queue (
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

CREATE INDEX idx_notifications_pending 
  ON notification_queue (created_at)
  WHERE status = 'pending';

-- ============================================================================
-- 8. LEADERBOARD VIEW (refreshed every 60 seconds via pg_cron)
-- ============================================================================
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
  -- ROI based on initial capital of most recent session
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
HAVING COUNT(t.id) >= 10  -- Minimum 10 trades to appear on leaderboard
ORDER BY total_pnl DESC;

CREATE UNIQUE INDEX idx_leaderboard_user ON leaderboard (user_id);

-- Refresh leaderboard every 60 seconds
SELECT cron.schedule(
  'refresh-leaderboard',
  '* * * * *',  -- Every minute
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard$$
);

-- ============================================================================
-- 9. DATABASE TRIGGER: COPY-TRADE FAN-OUT
-- ============================================================================
-- When a leader's trade is inserted, automatically queue copy trades for all followers.
-- This is the most reliable approach because:
-- 1. It's transactional (trade + queue entries in same transaction)
-- 2. It's guaranteed to fire (DB triggers never miss)
-- 3. It doesn't slow down the leader (queue is processed async)
--
-- Alternative considered: API fan-out
-- Rejected because: if API crashes mid-fan-out, some followers miss the trade.
-- With DB trigger + queue, the Edge Function can retry failed items.
CREATE OR REPLACE FUNCTION trigger_copy_trade_fanout()
RETURNS TRIGGER AS $$
DECLARE
  follow RECORD;
  leader_capital NUMERIC(15,2);
  follower_session RECORD;
  scaled_quantity NUMERIC(18,8);
BEGIN
  -- Only fan out for non-copy trades (prevent infinite recursion)
  IF NEW.is_copy = true THEN
    RETURN NEW;
  END IF;

  -- Get leader's current capital for scaling
  SELECT current_capital INTO leader_capital
  FROM trading_sessions
  WHERE id = NEW.session_id;

  -- For each active follower, queue a copy trade
  FOR follow IN
    SELECT cf.*, up.tier
    FROM copy_trading_follows cf
    JOIN user_profiles up ON up.id = cf.follower_id
    WHERE cf.leader_id = NEW.user_id
      AND cf.is_active = true
  LOOP
    -- Check tier limits
    -- (follower_id's active follow count must be within tier limit)
    
    -- Find follower's active session for this pair
    SELECT * INTO follower_session
    FROM trading_sessions
    WHERE user_id = follow.follower_id
      AND trading_pair = NEW.trading_pair
      AND status = 'active'
    LIMIT 1;
    
    -- Skip if follower has no active session for this pair
    IF follower_session IS NULL THEN
      CONTINUE;
    END IF;

    -- Scale quantity: (follower_capital / leader_capital) * leader_quantity * scale_factor
    scaled_quantity := CASE
      WHEN leader_capital > 0 THEN
        (follower_session.current_capital / leader_capital) * NEW.quantity * follow.scale_factor
      ELSE 0
    END;

    -- Skip if scaled quantity is too small
    IF scaled_quantity < 0.00000001 THEN
      CONTINUE;
    END IF;

    -- Apply max trade size cap if set
    IF follow.max_trade_size IS NOT NULL THEN
      scaled_quantity := LEAST(scaled_quantity, follow.max_trade_size / NEW.price);
    END IF;

    -- Queue the copy trade
    INSERT INTO copy_trade_queue (
      leader_trade_id, follower_id, follow_id,
      trading_pair, side, quantity, price, mode
    ) VALUES (
      NEW.id, follow.follower_id, follow.id,
      NEW.trading_pair, NEW.side, scaled_quantity, NEW.price, follower_session.mode
    )
    ON CONFLICT (leader_trade_id, follower_id) DO NOTHING;  -- Idempotent
  END LOOP;

  -- Notify the copy-trade processor Edge Function
  PERFORM pg_notify('copy_trade_queue', json_build_object(
    'leader_trade_id', NEW.id,
    'count', (SELECT COUNT(*) FROM copy_trade_queue WHERE leader_trade_id = NEW.id AND status = 'pending')
  )::text);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_trade_inserted
  AFTER INSERT ON trades
  FOR EACH ROW
  EXECUTE FUNCTION trigger_copy_trade_fanout();

-- ============================================================================
-- 10. DATABASE TRIGGER: UPDATE SESSION STATE
-- ============================================================================
-- After a trade is inserted, update the session's mutable state atomically.
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
      WHEN NEW.side = 'sell' THEN NULL  -- Position closed
    END,
    total_trades = total_trades + 1,
    winning_trades = CASE
      WHEN NEW.realized_pnl > 0 THEN winning_trades + 1
      ELSE winning_trades
    END,
    total_pnl = total_pnl + COALESCE(NEW.realized_pnl, 0),
    last_tick_at = now(),
    updated_at = now()
  WHERE id = NEW.session_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_trade_update_session
  AFTER INSERT ON trades
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_session_state();

-- ============================================================================
-- 11. NOTIFICATION TRIGGER
-- ============================================================================
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

CREATE TRIGGER on_trade_notify
  AFTER INSERT ON trades
  FOR EACH ROW
  EXECUTE FUNCTION trigger_trade_notification();

-- ============================================================================
-- 12. CRASH DETECTION CRON (runs every minute)
-- ============================================================================
-- Detects sessions with stale heartbeats and marks them as crashed.
-- The recovery API endpoint will handle actual resumption.
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
-- 13. DATA ARCHIVAL CRON (keeps DB under 500MB free tier)
-- ============================================================================
-- Archive trades older than 90 days to a summary table
CREATE TABLE archived_trade_summaries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  session_id  UUID NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end  TIMESTAMPTZ NOT NULL,
  total_trades INTEGER NOT NULL,
  total_pnl   NUMERIC(15,2) NOT NULL,
  win_rate    NUMERIC(5,2) NOT NULL,
  trade_data  JSONB NOT NULL,  -- Compressed summary
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

SELECT cron.schedule(
  'archive-old-trades',
  '0 3 * * 0',  -- Every Sunday at 3 AM
  $$
    WITH old_trades AS (
      DELETE FROM trades
      WHERE executed_at < now() - INTERVAL '90 days'
        AND status = 'filled'
      RETURNING *
    )
    INSERT INTO archived_trade_summaries (user_id, session_id, period_start, period_end, total_trades, total_pnl, win_rate, trade_data)
    SELECT 
      user_id, session_id,
      MIN(executed_at), MAX(executed_at),
      COUNT(*),
      COALESCE(SUM(realized_pnl), 0),
      ROUND(SUM(CASE WHEN realized_pnl > 0 THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2),
      jsonb_agg(jsonb_build_object('side', side, 'qty', quantity, 'price', price, 'pnl', realized_pnl, 'at', executed_at))
    FROM old_trades
    GROUP BY user_id, session_id;
  $$
);

-- ============================================================================
-- 14. ROW LEVEL SECURITY (users only see their own data)
-- ============================================================================

-- user_profiles: own profile only
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- trading_sessions: own sessions only
ALTER TABLE trading_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sessions" ON trading_sessions
  FOR ALL USING (auth.uid() = user_id);

-- trades: own trades + can see leader trades they follow
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own trades" ON trades
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users see leader trades" ON trades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM copy_trading_follows
      WHERE follower_id = auth.uid()
        AND leader_id = trades.user_id
        AND is_active = true
    )
  );
-- Service role bypasses RLS for API routes
CREATE POLICY "Service role full access" ON trades
  FOR ALL USING (auth.role() = 'service_role');

-- copy_trading_follows: participants only
ALTER TABLE copy_trading_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own follows" ON copy_trading_follows
  FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = leader_id);
CREATE POLICY "Users manage own follows" ON copy_trading_follows
  FOR ALL USING (auth.uid() = follower_id);

-- notification_queue: own notifications only
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications" ON notification_queue
  FOR SELECT USING (auth.uid() = user_id);

-- copy_trade_queue: service role only (processed by Edge Function)
ALTER TABLE copy_trade_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role processes queue" ON copy_trade_queue
  FOR ALL USING (auth.role() = 'service_role');

-- leaderboard: public read
-- (Materialized views don't support RLS, but we grant SELECT to authenticated)
GRANT SELECT ON leaderboard TO authenticated;

-- ============================================================================
-- 15. HELPER FUNCTIONS
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
