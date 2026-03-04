-- ============================================================================
-- KLARPAKKE TRADING PLATFORM - CORE DATABASE SCHEMA v3
-- ============================================================================
-- KRITISKE FIKSER:
-- - pg_cron jobs bruker funksjoner, ikke inline SQL med WITH
-- - Alle cron kall wrapper i try-catch
-- ============================================================================

-- ============================================================================
-- 0. CLEANUP
-- ============================================================================

DROP TRIGGER IF EXISTS on_trade_inserted ON trades;
DROP TRIGGER IF EXISTS on_trade_update_session ON trades;
DROP TRIGGER IF EXISTS on_trade_notify ON trades;

DROP FUNCTION IF EXISTS trigger_copy_trade_fanout();
DROP FUNCTION IF EXISTS trigger_update_session_state();
DROP FUNCTION IF EXISTS trigger_trade_notification();
DROP FUNCTION IF EXISTS generate_trade_idempotency_key(UUID, trade_side, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS can_follow_leader(UUID);
DROP FUNCTION IF EXISTS detect_crashed_sessions();

DROP MATERIALIZED VIEW IF EXISTS leaderboard;

DROP TABLE IF EXISTS archived_trade_summaries CASCADE;
DROP TABLE IF EXISTS copy_trade_queue CASCADE;
DROP TABLE IF EXISTS notification_queue CASCADE;
DROP TABLE IF EXISTS copy_trading_follows CASCADE;
DROP TABLE IF EXISTS trades CASCADE;
DROP TABLE IF EXISTS trading_sessions CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

DROP TYPE IF EXISTS order_type CASCADE;
DROP TYPE IF EXISTS trade_status CASCADE;
DROP TYPE IF EXISTS trade_side CASCADE;
DROP TYPE IF EXISTS session_status CASCADE;
DROP TYPE IF EXISTS trading_mode CASCADE;
DROP TYPE IF EXISTS subscription_tier CASCADE;

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pgsodium";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================================================
-- 2. ENUMS
-- ============================================================================

CREATE TYPE subscription_tier AS ENUM ('free', 'bachelor', 'master', 'phd', 'professor');
CREATE TYPE trading_mode AS ENUM ('paper', 'live');
CREATE TYPE session_status AS ENUM ('active', 'paused', 'crashed', 'stopped');
CREATE TYPE trade_side AS ENUM ('buy', 'sell');
CREATE TYPE trade_status AS ENUM ('pending', 'filled', 'partially_filled', 'cancelled', 'failed');
CREATE TYPE order_type AS ENUM ('market', 'limit', 'stop_loss', 'take_profit');

-- ============================================================================
-- 3. USER PROFILES
-- ============================================================================

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Trader',
  avatar_url TEXT,
  tier subscription_tier NOT NULL DEFAULT 'free',
  tier_expires_at TIMESTAMPTZ,
  paper_balance NUMERIC(15,2) NOT NULL DEFAULT 1000000.00,
  binance_api_key_id UUID REFERENCES vault.secrets(id),
  binance_api_secret_id UUID REFERENCES vault.secrets(id),
  binance_connected BOOLEAN NOT NULL DEFAULT false,
  email_on_trade BOOLEAN NOT NULL DEFAULT true,
  email_on_crash BOOLEAN NOT NULL DEFAULT true,
  email_daily_digest BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. TRADING SESSIONS
-- ============================================================================

CREATE TABLE trading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode trading_mode NOT NULL DEFAULT 'paper',
  status session_status NOT NULL DEFAULT 'active',
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
CREATE INDEX idx_sessions_heartbeat ON trading_sessions (last_heartbeat) WHERE status = 'active';
CREATE INDEX idx_sessions_user ON trading_sessions (user_id, status);

-- ============================================================================
-- 5. TRADES
-- ============================================================================

CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES trading_sessions(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  idempotency_key TEXT NOT NULL,
  mode trading_mode NOT NULL,
  trading_pair TEXT NOT NULL,
  side trade_side NOT NULL,
  order_type order_type NOT NULL DEFAULT 'market',
  quantity NUMERIC(18,8) NOT NULL,
  price NUMERIC(18,8) NOT NULL,
  total_value NUMERIC(15,2) NOT NULL,
  fee NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  status trade_status NOT NULL DEFAULT 'filled',
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
CREATE INDEX idx_trades_leader ON trades (leader_trade_id) WHERE leader_trade_id IS NOT NULL;

-- ============================================================================
-- 6. COPY-TRADING
-- ============================================================================

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
CREATE INDEX idx_follow_leader ON copy_trading_follows (leader_id) WHERE is_active = true;
CREATE INDEX idx_follow_follower ON copy_trading_follows (follower_id) WHERE is_active = true;

-- ============================================================================
-- 7. COPY-TRADE QUEUE
-- ============================================================================

CREATE TABLE copy_trade_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_trade_id UUID NOT NULL REFERENCES trades(id),
  follower_id UUID NOT NULL REFERENCES auth.users(id),
  follow_id UUID NOT NULL REFERENCES copy_trading_follows(id),
  trading_pair TEXT NOT NULL,
  side trade_side NOT NULL,
  quantity NUMERIC(18,8) NOT NULL,
  price NUMERIC(18,8) NOT NULL,
  mode trading_mode NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  attempts INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_copy_queue_pending ON copy_trade_queue (created_at) WHERE status = 'pending';
CREATE UNIQUE INDEX idx_copy_queue_unique ON copy_trade_queue (leader_trade_id, follower_id);

-- ============================================================================
-- 8. NOTIFICATION QUEUE
-- ============================================================================

CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('trade_executed', 'bot_crashed', 'bot_recovered', 'copy_started', 'daily_digest', 'subscription_change')),
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_pending ON notification_queue (created_at) WHERE status = 'pending';

-- ============================================================================
-- 9. ARCHIVED TRADES
-- ============================================================================

CREATE TABLE archived_trade_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  session_id UUID NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  total_trades INTEGER NOT NULL,
  total_pnl NUMERIC(15,2) NOT NULL,
  win_rate NUMERIC(5,2) NOT NULL,
  trade_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 10. LEADERBOARD
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
    WHEN COUNT(t.id) > 0 THEN ROUND((SUM(CASE WHEN t.realized_pnl > 0 THEN 1 ELSE 0 END)::NUMERIC / COUNT(t.id)) * 100, 1)
    ELSE 0
  END AS win_rate,
  CASE
    WHEN MAX(ts.initial_capital) > 0 THEN ROUND((COALESCE(SUM(t.realized_pnl), 0) / MAX(ts.initial_capital)) * 100, 2)
    ELSE 0
  END AS roi_percent,
  (SELECT COUNT(*) FROM copy_trading_follows cf WHERE cf.leader_id = up.id AND cf.is_active = true) AS follower_count,
  MAX(t.executed_at) AS last_trade_at
FROM user_profiles up
LEFT JOIN trades t ON t.user_id = up.id AND t.mode = 'paper' AND t.status = 'filled'
LEFT JOIN trading_sessions ts ON ts.user_id = up.id
WHERE t.executed_at > now() - INTERVAL '30 days'
GROUP BY up.id, up.display_name, up.avatar_url
HAVING COUNT(t.id) >= 10
ORDER BY total_pnl DESC;

CREATE UNIQUE INDEX idx_leaderboard_user ON leaderboard (user_id);

-- ============================================================================
-- 11. TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_copy_trade_fanout()
RETURNS TRIGGER AS $$
DECLARE
  follow RECORD;
  leader_capital NUMERIC(15,2);
  follower_session RECORD;
  scaled_quantity NUMERIC(18,8);
BEGIN
  IF NEW.is_copy = true THEN
    RETURN NEW;
  END IF;
  
  SELECT current_capital INTO leader_capital
  FROM trading_sessions WHERE id = NEW.session_id;
  
  FOR follow IN
    SELECT cf.*, up.tier
    FROM copy_trading_follows cf
    JOIN user_profiles up ON up.id = cf.follower_id
    WHERE cf.leader_id = NEW.user_id AND cf.is_active = true
  LOOP
    SELECT * INTO follower_session
    FROM trading_sessions
    WHERE user_id = follow.follower_id
    AND trading_pair = NEW.trading_pair
    AND status = 'active'
    LIMIT 1;
    
    IF follower_session IS NULL THEN
      CONTINUE;
    END IF;
    
    scaled_quantity := CASE
      WHEN leader_capital > 0 THEN
        (follower_session.current_capital / leader_capital) * NEW.quantity * follow.scale_factor
      ELSE 0
    END;
    
    IF scaled_quantity < 0.00000001 THEN
      CONTINUE;
    END IF;
    
    IF follow.max_trade_size IS NOT NULL THEN
      scaled_quantity := LEAST(scaled_quantity, follow.max_trade_size / NEW.price);
    END IF;
    
    INSERT INTO copy_trade_queue (
      leader_trade_id, follower_id, follow_id,
      trading_pair, side, quantity, price, mode
    ) VALUES (
      NEW.id, follow.follower_id, follow.id,
      NEW.trading_pair, NEW.side, scaled_quantity, NEW.price, follower_session.mode
    )
    ON CONFLICT (leader_trade_id, follower_id) DO NOTHING;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_trade_inserted
  AFTER INSERT ON trades
  FOR EACH ROW EXECUTE FUNCTION trigger_copy_trade_fanout();

CREATE OR REPLACE FUNCTION trigger_update_session_state()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE trading_sessions
  SET
    current_capital = CASE
      WHEN NEW.side = 'buy' THEN current_capital - NEW.total_value - NEW.fee
      ELSE current_capital + NEW.total_value - NEW.fee
    END,
    open_position = CASE
      WHEN NEW.side = 'buy' THEN jsonb_build_object(
        'side', 'long',
        'quantity', NEW.quantity,
        'entryprice', NEW.price,
        'entrytime', NEW.executed_at
      )
      ELSE NULL
    END,
    total_trades = total_trades + 1,
    winning_trades = CASE WHEN NEW.realized_pnl > 0 THEN winning_trades + 1 ELSE winning_trades END,
    total_pnl = total_pnl + COALESCE(NEW.realized_pnl, 0),
    last_tick_at = now(),
    updated_at = now()
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_trade_update_session
  AFTER INSERT ON trades
  FOR EACH ROW EXECUTE FUNCTION trigger_update_session_state();

CREATE OR REPLACE FUNCTION trigger_trade_notification()
RETURNS TRIGGER AS $$
DECLARE
  should_notify BOOLEAN;
BEGIN
  SELECT email_on_trade INTO should_notify
  FROM user_profiles WHERE id = NEW.user_id;
  
  IF should_notify THEN
    INSERT INTO notification_queue (user_id, type, payload)
    VALUES (
      NEW.user_id,
      'trade_executed',
      jsonb_build_object(
        'trade_id', NEW.id,
        'side', NEW.side,
        'quantity', NEW.quantity,
        'price', NEW.price,
        'trading_pair', NEW.trading_pair,
        'is_copy', NEW.is_copy,
        'realized_pnl', NEW.realized_pnl
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_trade_notify
  AFTER INSERT ON trades
  FOR EACH ROW EXECUTE FUNCTION trigger_trade_notification();

-- ============================================================================
-- 12. HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_trade_idempotency_key(
  p_session_id UUID,
  p_side trade_side,
  p_timestamp TIMESTAMPTZ DEFAULT now()
) RETURNS TEXT AS $$
BEGIN
  RETURN p_session_id || '-' || p_side || '-' || to_char(p_timestamp, 'YYYYMMDD-HH24MISS-MS');
END;
$$ LANGUAGE plpgsql;

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
-- 13. RLS POLICIES
-- ============================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE trading_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sessions" ON trading_sessions FOR ALL USING (auth.uid() = user_id);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own trades" ON trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users see leader trades" ON trades FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM copy_trading_follows
    WHERE follower_id = auth.uid() AND leader_id = trades.user_id AND is_active = true
  )
);

ALTER TABLE copy_trading_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own follows" ON copy_trading_follows FOR SELECT 
  USING (auth.uid() = follower_id OR auth.uid() = leader_id);
CREATE POLICY "Users manage own follows" ON copy_trading_follows FOR ALL 
  USING (auth.uid() = follower_id);

ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications" ON notification_queue FOR SELECT 
  USING (auth.uid() = user_id);

ALTER TABLE copy_trade_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role processes queue" ON copy_trade_queue FOR ALL 
  USING (auth.role() = 'service_role');

GRANT SELECT ON leaderboard TO authenticated;

-- ============================================================================
-- 14. PG_CRON JOBS (forenklet - uten WITH i inline SQL)
-- ============================================================================

-- Funksjon for å detect crashed sessions
CREATE OR REPLACE FUNCTION detect_crashed_sessions()
RETURNS void AS $$
DECLARE
  crashed_record RECORD;
BEGIN
  FOR crashed_record IN
    UPDATE trading_sessions
    SET status = 'crashed', updated_at = now()
    WHERE status = 'active'
    AND last_heartbeat < now() - INTERVAL '5 minutes'
    RETURNING id, user_id
  LOOP
    INSERT INTO notification_queue (user_id, type, payload)
    VALUES (crashed_record.user_id, 'bot_crashed', jsonb_build_object('session_id', crashed_record.id));
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cron jobs (med error handling)
DO $$
BEGIN
  BEGIN
    PERFORM cron.schedule('refresh-leaderboard', '* * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard');
    RAISE NOTICE 'refresh-leaderboard scheduled';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule refresh-leaderboard: %', SQLERRM;
  END;
  
  BEGIN
    PERFORM cron.schedule('detect-crashed-sessions', '* * * * *', 'SELECT detect_crashed_sessions()');
    RAISE NOTICE 'detect-crashed-sessions scheduled';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule detect-crashed-sessions: %', SQLERRM;
  END;
END $$;

-- ============================================================================
-- 15. DONE
-- ============================================================================

SELECT 'Schema v3 deployed successfully!' as status;
