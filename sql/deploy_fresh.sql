-- ============================================================================
-- KLARPAKKE AUTO-TRADING - FRESH DEPLOY
-- ============================================================================
-- DENNE FILEN: Sletter ALT først, så deployer schema på nytt
-- ============================================================================

-- ============================================================================
-- STEP 0: DROP EVERYTHING
-- ============================================================================
DROP INDEX IF EXISTS idx_leaderboard_user CASCADE;
DROP INDEX IF EXISTS idx_trades_idempotency CASCADE;
DROP INDEX IF EXISTS idx_trades_session CASCADE;
DROP INDEX IF EXISTS idx_trades_user CASCADE;
DROP INDEX IF EXISTS idx_trades_leader CASCADE;
DROP INDEX IF EXISTS idx_follow_unique CASCADE;
DROP INDEX IF EXISTS idx_follow_leader CASCADE;
DROP INDEX IF EXISTS idx_follow_follower CASCADE;
DROP INDEX IF EXISTS idx_copy_queue_pending CASCADE;
DROP INDEX IF EXISTS idx_copy_queue_unique CASCADE;
DROP INDEX IF EXISTS idx_notifications_pending CASCADE;
DROP INDEX IF EXISTS idx_unique_active_session CASCADE;
DROP INDEX IF EXISTS idx_sessions_heartbeat CASCADE;
DROP INDEX IF EXISTS idx_sessions_user CASCADE;

DROP TRIGGER IF EXISTS on_trade_inserted ON trades;
DROP TRIGGER IF EXISTS on_trade_update_session ON trades;
DROP TRIGGER IF EXISTS on_trade_notify ON trades;

DROP FUNCTION IF EXISTS trigger_copy_trade_fanout() CASCADE;
DROP FUNCTION IF EXISTS trigger_update_session_state() CASCADE;
DROP FUNCTION IF EXISTS trigger_trade_notification() CASCADE;
DROP FUNCTION IF EXISTS detect_crashed_sessions() CASCADE;
DROP FUNCTION IF EXISTS generate_trade_idempotency_key(UUID, trade_side, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS can_follow_leader(UUID) CASCADE;

DROP MATERIALIZED VIEW IF EXISTS leaderboard CASCADE;

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
-- STEP 1: EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pgsodium;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- STEP 2: ENUMS
-- ============================================================================
CREATE TYPE subscription_tier AS ENUM ('free', 'student', 'master', 'phd', 'professor');
CREATE TYPE trading_mode AS ENUM ('paper', 'live');
CREATE TYPE session_status AS ENUM ('active', 'paused', 'crashed', 'stopped');
CREATE TYPE trade_side AS ENUM ('buy', 'sell');
CREATE TYPE trade_status AS ENUM ('pending', 'executed', 'failed');
CREATE TYPE order_type AS ENUM ('market', 'limit', 'stop_loss', 'take_profit');

-- ============================================================================
-- STEP 3: TABLES
-- ============================================================================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tier subscription_tier NOT NULL DEFAULT 'free',
  paper_balance DECIMAL(20, 8) NOT NULL DEFAULT 10000.00,
  real_balance DECIMAL(20, 8) DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE trading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  trading_pair VARCHAR(20) NOT NULL,
  mode trading_mode NOT NULL DEFAULT 'paper',
  strategy VARCHAR(50) NOT NULL DEFAULT 'dca',
  status session_status NOT NULL DEFAULT 'active',
  params JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  stopped_at TIMESTAMPTZ,
  last_tick_at TIMESTAMPTZ,
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  pnl DECIMAL(20, 8) DEFAULT 0.00,
  UNIQUE (user_id, trading_pair, status)
);

CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES trading_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  trading_pair VARCHAR(20) NOT NULL,
  side trade_side NOT NULL,
  order_type order_type NOT NULL DEFAULT 'market',
  amount DECIMAL(20, 8) NOT NULL,
  price DECIMAL(20, 8) NOT NULL,
  fee DECIMAL(20, 8) DEFAULT 0.00,
  pnl DECIMAL(20, 8),
  status trade_status NOT NULL DEFAULT 'pending',
  idempotency_key TEXT NOT NULL UNIQUE,
  metadata JSONB DEFAULT '{}',
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE copy_trading_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  leader_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  allocation_percent DECIMAL(5, 2) NOT NULL CHECK (allocation_percent > 0 AND allocation_percent <= 100),
  max_trade_amount DECIMAL(20, 8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (follower_id, leader_id)
);

CREATE TABLE copy_trade_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  leader_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  follower_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  allocation_percent DECIMAL(5, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'failed')),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE archived_trade_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  trading_pair VARCHAR(20) NOT NULL,
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  gross_pnl DECIMAL(20, 8) DEFAULT 0.00,
  fees_paid DECIMAL(20, 8) DEFAULT 0.00,
  net_pnl DECIMAL(20, 8) DEFAULT 0.00,
  UNIQUE (user_id, month, trading_pair)
);

-- ============================================================================
-- STEP 4: INDEXES
-- ============================================================================
CREATE INDEX idx_sessions_user ON trading_sessions(user_id);
CREATE INDEX idx_sessions_heartbeat ON trading_sessions(last_heartbeat) WHERE status = 'active';
CREATE UNIQUE INDEX idx_unique_active_session ON trading_sessions(user_id, trading_pair) WHERE status = 'active';
CREATE INDEX idx_trades_user ON trades(user_id);
CREATE INDEX idx_trades_session ON trades(session_id);
CREATE UNIQUE INDEX idx_trades_idempotency ON trades(idempotency_key);
CREATE INDEX idx_trades_leader ON copy_trading_follows(leader_id);
CREATE INDEX idx_follow_follower ON copy_trading_follows(follower_id);
CREATE UNIQUE INDEX idx_follow_unique ON copy_trading_follows(follower_id, leader_id);
CREATE INDEX idx_copy_queue_pending ON copy_trade_queue(status) WHERE status = 'pending';
CREATE UNIQUE INDEX idx_copy_queue_unique ON copy_trade_queue(original_trade_id, follower_id);
CREATE INDEX idx_notifications_pending ON notification_queue(user_id, is_read) WHERE is_read = FALSE;
CREATE UNIQUE INDEX idx_leaderboard_user ON user_profiles(user_id);

-- ============================================================================
-- STEP 5: MATERIALIZED VIEW
-- ============================================================================
CREATE MATERIALIZED VIEW leaderboard AS
SELECT 
  up.user_id,
  up.tier,
  COUNT(DISTINCT ts.id) FILTER (WHERE ts.mode = 'live') as live_sessions,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'executed' AND ts.mode = 'live') as total_trades,
  COALESCE(SUM(t.pnl) FILTER (WHERE t.status = 'executed' AND ts.mode = 'live'), 0) as total_pnl,
  CASE 
    WHEN COUNT(t.id) FILTER (WHERE t.status = 'executed' AND ts.mode = 'live') > 0 
    THEN (COUNT(t.id) FILTER (WHERE t.pnl > 0 AND t.status = 'executed' AND ts.mode = 'live')::DECIMAL / 
          COUNT(t.id) FILTER (WHERE t.status = 'executed' AND ts.mode = 'live') * 100)
    ELSE 0 
  END as win_rate,
  ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(t.pnl) FILTER (WHERE t.status = 'executed' AND ts.mode = 'live'), 0) DESC) as rank
FROM user_profiles up
LEFT JOIN trading_sessions ts ON up.id = ts.user_id
LEFT JOIN trades t ON ts.id = t.session_id
GROUP BY up.id, up.user_id, up.tier;

-- ============================================================================
-- STEP 6: FUNCTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION detect_crashed_sessions()
RETURNS void
LANGUAGE plpgsql
AS $$
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
    VALUES (
      crashed_record.user_id, 
      'bot_crashed', 
      jsonb_build_object('session_id', crashed_record.id)
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION generate_trade_idempotency_key(
  p_session_id UUID,
  p_side trade_side,
  p_timestamp TIMESTAMPTZ
) RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encode(
    digest(
      concat(p_session_id::text, '-', p_side::text, '-', extract(epoch from p_timestamp)::bigint::text),
      'sha256'
    ),
    'hex'
  );
END;
$$;

CREATE OR REPLACE FUNCTION can_follow_leader(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  user_tier subscription_tier;
BEGIN
  SELECT tier INTO user_tier FROM user_profiles WHERE id = p_user_id;
  RETURN user_tier IN ('phd', 'professor');
END;
$$;

-- ============================================================================
-- STEP 7: TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_copy_trade_fanout()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO copy_trade_queue (original_trade_id, leader_id, follower_id, allocation_percent)
  SELECT NEW.id, NEW.user_id, cf.follower_id, cf.allocation_percent
  FROM copy_trading_follows cf
  WHERE cf.leader_id = NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_trade_inserted
  AFTER INSERT ON trades
  FOR EACH ROW
  EXECUTE FUNCTION trigger_copy_trade_fanout();

CREATE OR REPLACE FUNCTION trigger_update_session_state()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE trading_sessions
  SET 
    total_trades = total_trades + 1,
    winning_trades = CASE WHEN NEW.pnl > 0 THEN winning_trades + 1 ELSE winning_trades END,
    losing_trades = CASE WHEN NEW.pnl < 0 THEN losing_trades + 1 ELSE losing_trades END,
    pnl = pnl + COALESCE(NEW.pnl, 0)
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_trade_update_session
  AFTER INSERT ON trades
  FOR EACH ROW
  WHEN (NEW.status = 'executed')
  EXECUTE FUNCTION trigger_update_session_state();

CREATE OR REPLACE FUNCTION trigger_trade_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO notification_queue (user_id, type, payload)
  VALUES (
    NEW.user_id,
    CASE 
      WHEN NEW.status = 'executed' THEN 'trade_executed'
      WHEN NEW.status = 'failed' THEN 'trade_failed'
      ELSE 'trade_pending'
    END,
    jsonb_build_object(
      'trade_id', NEW.id,
      'session_id', NEW.session_id,
      'side', NEW.side,
      'amount', NEW.amount,
      'price', NEW.price
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_trade_notify
  AFTER INSERT ON trades
  FOR EACH ROW
  EXECUTE FUNCTION trigger_trade_notification();

-- ============================================================================
-- STEP 8: CRON JOBS
-- ============================================================================
SELECT cron.schedule('refresh-leaderboard', '* * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard');
SELECT cron.schedule('detect-crashed-sessions', '* * * * *', 'SELECT detect_crashed_sessions()');

-- ============================================================================
-- STEP 9: RLS POLICIES
-- ============================================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE copy_trading_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE copy_trade_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_trade_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own sessions" ON trading_sessions FOR SELECT USING (user_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can manage own sessions" ON trading_sessions FOR ALL USING (user_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own trades" ON trades FOR SELECT USING (user_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own trades" ON trades FOR INSERT WITH CHECK (user_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own follows" ON copy_trading_follows FOR SELECT USING (follower_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can manage own follows" ON copy_trading_follows FOR ALL USING (follower_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own copy queue" ON copy_trade_queue FOR SELECT USING (follower_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own notifications" ON notification_queue FOR SELECT USING (user_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own notifications" ON notification_queue FOR UPDATE USING (user_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own summaries" ON archived_trade_summaries FOR SELECT USING (user_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()));

-- ============================================================================
-- SUCCESS!
-- ============================================================================
SELECT '✅ Schema deployed successfully!' as status;
