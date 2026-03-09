-- ============================================
-- KLA-137: Trading Safety Core
-- P0 Launch Safety Track for Autotrading
-- ============================================

-- 1. OPPDATERT risk_profiles med KLA-137 felter
ALTER TABLE risk_profiles 
  ADD COLUMN IF NOT EXISTS max_daily_loss_pct DECIMAL(5,2) DEFAULT 3.0,
  ADD COLUMN IF NOT EXISTS allowed_pairs TEXT[] DEFAULT '{BTCUSDT,ETHUSDT}',
  ADD COLUMN IF NOT EXISTS leverage_allowed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_position_pct DECIMAL(5,2) DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS max_exposure_pct DECIMAL(5,2) DEFAULT 15.0;

-- Oppdater eksisterende profiler med nye defaults
UPDATE risk_profiles 
  SET max_daily_loss_pct = COALESCE(max_daily_loss_pct, 3.0),
      max_position_pct = COALESCE(max_position_pct, max_position_size_pct, 5.0),
      max_exposure_pct = COALESCE(max_exposure_pct, max_total_exposure_pct, 15.0),
      allowed_pairs = COALESCE(allowed_pairs, '{BTCUSDT,ETHUSDT}'),
      leverage_allowed = COALESCE(leverage_allowed, false);

-- 2. OPPDATERT bot_health med KLA-137 felter
ALTER TABLE bot_health
  ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('running', 'paused', 'error', 'stopped')) DEFAULT 'stopped',
  ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS error_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consecutive_errors INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_consecutive_errors INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. NY trade_rejections tabell
CREATE TABLE IF NOT EXISTS trade_rejections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES trading_sessions(id) ON DELETE SET NULL,
  
  -- Trade detaljer som ble forsøkt
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('market', 'limit')),
  trading_mode TEXT NOT NULL CHECK (trading_mode IN ('paper', 'live')),
  
  -- Rejection årsak
  rejection_reason TEXT NOT NULL CHECK (rejection_reason IN (
    'NO_RISK_PROFILE',
    'BOT_NOT_HEALTHY',
    'LIVE_NOT_ALLOWED',
    'POSITION_LIMIT_EXCEEDED',
    'EXPOSURE_LIMIT_EXCEEDED',
    'DAILY_LOSS_LIMIT_EXCEEDED',
    'DAILY_LOSS_CHECK_FAILED',
    'PAIR_NOT_ALLOWED',
    'LEVERAGE_NOT_ALLOWED',
    'INSUFFICIENT_BALANCE',
    'SESSION_NOT_ACTIVE',
    'INVALID_TRADING_MODE'
  )),
  rejection_details JSONB DEFAULT '{}',
  
  -- Kontekst
  risk_profile_id UUID REFERENCES risk_profiles(id) ON DELETE SET NULL,
  bot_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_rejections_user ON trade_rejections(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_rejections_session ON trade_rejections(session_id);
CREATE INDEX IF NOT EXISTS idx_trade_rejections_reason ON trade_rejections(rejection_reason);
CREATE INDEX IF NOT EXISTS idx_trade_rejections_created ON trade_rejections(created_at DESC);

-- 4. NY trade_decisions tabell (for audit trail)
CREATE TABLE IF NOT EXISTS trade_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES trading_sessions(id) ON DELETE CASCADE,
  
  -- Decision kontekst
  decision_type TEXT NOT NULL CHECK (decision_type IN ('allow', 'reject', 'modify')),
  trading_mode TEXT NOT NULL CHECK (trading_mode IN ('paper', 'live')),
  
  -- Input trade
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  requested_quantity NUMERIC NOT NULL,
  requested_price NUMERIC NOT NULL,
  
  -- Output (hvis allow/modify)
  executed_quantity NUMERIC,
  executed_price NUMERIC,
  
  -- Risk kontekst
  risk_profile_id UUID REFERENCES risk_profiles(id),
  pre_trade_position_pct NUMERIC,
  post_trade_position_pct NUMERIC,
  pre_trade_exposure_pct NUMERIC,
  post_trade_exposure_pct NUMERIC,
  daily_loss_pct NUMERIC,
  
  -- Reason hvis reject
  rejection_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_decisions_user ON trade_decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_decisions_session ON trade_decisions(session_id);
CREATE INDEX IF NOT EXISTS idx_trade_decisions_created ON trade_decisions(created_at DESC);

-- 5. RLS Policies
ALTER TABLE trade_rejections ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own trade rejections" 
  ON trade_rejections FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users view own trade decisions" 
  ON trade_decisions FOR SELECT USING (auth.uid() = user_id);

-- System kan insert (via service role)
CREATE POLICY "System insert trade rejections" 
  ON trade_rejections FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System insert trade decisions" 
  ON trade_decisions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. SEED standard risk profiler (hvis de ikke finnes)
INSERT INTO risk_profiles (user_id, name, max_position_pct, max_exposure_pct, max_daily_loss_pct, allowed_pairs, leverage_allowed, is_active)
SELECT 
  id as user_id,
  unnest(ARRAY['forsiktig', 'moderat', 'aggressiv']) as name,
  unnest(ARRAY[2.0, 5.0, 10.0]) as max_position_pct,
  unnest(ARRAY[5.0, 15.0, 30.0]) as max_exposure_pct,
  unnest(ARRAY[1.0, 3.0, 5.0]) as max_daily_loss_pct,
  unnest(ARRAY['{BTCUSDT,ETHUSDT}'::text[], '{BTCUSDT,ETHUSDT,SOLUSDT}'::text[], '{BTCUSDT,ETHUSDT,SOLUSDT,ADAUSDT,DOTUSDT}'::text[]]) as allowed_pairs,
  false as leverage_allowed,
  CASE WHEN unnest(ARRAY['forsiktig', 'moderat', 'aggressiv']) = 'forsiktig' THEN true ELSE false END as is_active
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM risk_profiles rp WHERE rp.user_id = auth.users.id
)
ON CONFLICT DO NOTHING;

-- 7. Funksjon for å beregne daily loss
CREATE OR REPLACE FUNCTION calculate_daily_loss(p_user_id UUID, p_session_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  daily_loss NUMERIC;
BEGIN
  SELECT COALESCE(SUM(
    CASE 
      WHEN side = 'sell' AND price < (
        SELECT AVG(price) FROM trades t2 
        WHERE t2.session_id = p_session_id 
        AND t2.side = 'buy' 
        AND t2.created_at::date = CURRENT_DATE
      ) THEN (price - (
        SELECT AVG(price) FROM trades t2 
        WHERE t2.session_id = p_session_id 
        AND t2.side = 'buy' 
        AND t2.created_at::date = CURRENT_DATE
      )) * quantity
      ELSE 0
    END
  ), 0) INTO daily_loss
  FROM trades
  WHERE user_id = p_user_id
  AND session_id = p_session_id
  AND created_at::date = CURRENT_DATE
  AND side = 'sell';
  
  RETURN daily_loss;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Funksjon for å sjekke bot health
CREATE OR REPLACE FUNCTION is_bot_healthy(p_bot_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  bot_record RECORD;
BEGIN
  SELECT * INTO bot_record FROM bot_health WHERE id = p_bot_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Sjekk status
  IF bot_record.status != 'running' THEN
    RETURN false;
  END IF;
  
  -- Sjekk heartbeat (maks 5 minutter gammel)
  IF bot_record.last_heartbeat < NOW() - INTERVAL '5 minutes' THEN
    RETURN false;
  END IF;
  
  -- Sjekk consecutive errors
  IF bot_record.consecutive_errors >= COALESCE(bot_record.max_consecutive_errors, 3) THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
