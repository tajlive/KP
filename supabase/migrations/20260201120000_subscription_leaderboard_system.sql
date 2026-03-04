-- Subscription, Trial, Leaderboard and Event Tracking System
-- Complete freemium infrastructure for Klarpakke
-- Tiers: free (14-day trial) -> standard (500kr) -> pluss (1000kr) -> vip_ekstrem (1500kr)

-- ============================================
-- 1. PROFILES (Extended user profiles) - ALTER existing table
-- ============================================
-- Add columns to existing profiles table (created in 001_profiles.sql)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'display_name') THEN
    -- Columns already exist, skip
    NULL;
  ELSE
    -- Add new columns
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'standard', 'pluss', 'vip_ekstrem'));
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'past_due', 'canceled', 'expired'));
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id);
  END IF;
END $$;

-- Index for fast lookup (only if columns exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_tier') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_tier ON profiles(subscription_tier);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_status') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(subscription_status);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'trial_ends_at') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_trial_ends ON profiles(trial_ends_at) WHERE subscription_status = 'trial';
  END IF;
END $$;

-- ============================================
-- 2. QUIZZES (Quiz definitions)
-- ============================================
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL CHECK (slug IN ('futures', 'risk_management', 'spot_basics')),
  title TEXT NOT NULL,
  description TEXT,
  pass_score INTEGER NOT NULL DEFAULT 80, -- Percentage to pass
  is_required_for_futures BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default quizzes
INSERT INTO quizzes (slug, title, description, pass_score, is_required_for_futures) VALUES
  ('spot_basics', 'Spot Trading Grunnleggende', 'Grunnleggende kunnskap om spot trading', 70, false),
  ('risk_management', 'Risikostyring', 'Lær å håndtere risiko i trading', 80, false),
  ('futures', 'Futures Trading Sertifisering', 'Påkrevd quiz for Futures-tilgang', 85, true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 3. QUIZ ATTEMPTS
-- ============================================
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  passed BOOLEAN NOT NULL DEFAULT false,
  answers JSONB DEFAULT '[]'::jsonb, -- Store answers for review
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_passed ON quiz_attempts(user_id, quiz_id, passed) WHERE passed = true;

-- ============================================
-- 4. ENTITLEMENTS VIEW (Computed permissions)
-- ============================================
CREATE OR REPLACE VIEW user_entitlements AS
WITH quiz_status AS (
  SELECT
    user_id,
    bool_or(passed) FILTER (WHERE q.slug = 'futures') AS futures_quiz_passed
  FROM quiz_attempts qa
  JOIN quizzes q ON qa.quiz_id = q.id
  WHERE qa.passed = true
  GROUP BY user_id
)
SELECT
  p.id as user_id,
  p.display_name,
  p.subscription_tier,
  p.subscription_status,
  p.trial_started_at,
  p.trial_ends_at,
  CASE 
    WHEN p.subscription_status = 'trial' AND p.trial_ends_at > NOW() THEN true
    WHEN p.subscription_status IN ('active', 'trial') THEN true
    ELSE false
  END AS is_trial_active,
  CASE 
    WHEN p.trial_ends_at < NOW() AND p.subscription_status = 'trial' THEN true
    ELSE false
  END AS is_trial_expired,
  -- Feature entitlements
  p.subscription_tier IN ('standard', 'pluss', 'vip_ekstrem') OR (p.subscription_status = 'trial' AND p.trial_ends_at > NOW()) AS can_access_spot,
  p.subscription_tier = 'vip_ekstrem' AND COALESCE(qs.futures_quiz_passed, false) AS can_access_futures,
  p.subscription_tier IN ('pluss', 'vip_ekstrem') AS can_use_sms,
  p.subscription_tier IN ('standard', 'pluss', 'vip_ekstrem') OR (p.subscription_status = 'trial' AND p.trial_ends_at > NOW()) AS can_use_autotrade,
  p.subscription_tier IN ('standard', 'pluss', 'vip_ekstrem') AS can_use_copy_trading,
  p.subscription_tier IN ('pluss', 'vip_ekstrem') AS can_use_limit_orders,
  p.subscription_tier = 'vip_ekstrem' AS can_use_margin,
  COALESCE(qs.futures_quiz_passed, false) AS futures_quiz_passed
FROM profiles p
LEFT JOIN quiz_status qs ON p.id = qs.user_id;

-- ============================================
-- 5. LEARNING EVENTS (Points basis for leaderboard)
-- ============================================
CREATE TABLE IF NOT EXISTS learning_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'module_completed',
    'quiz_passed',
    'risk_rule_followed',
    'paper_trade_closed_profit',
    'paper_trade_closed_loss',
    'daily_login',
    'referral_signup',
    'quiz_perfect_score'
  )),
  points INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_events_user ON learning_events(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_events_type ON learning_events(event_type);
CREATE INDEX IF NOT EXISTS idx_learning_events_created ON learning_events(created_at);
CREATE INDEX IF NOT EXISTS idx_learning_events_monthly ON learning_events(user_id, created_at);

-- ============================================
-- 6. LEADERBOARD MONTHLY
-- ============================================
CREATE TABLE IF NOT EXISTS leaderboard_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month DATE NOT NULL, -- First day of month
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  stats JSONB DEFAULT '{}'::jsonb, -- { modules_completed, quizzes_passed, trades_count, win_rate, risk_score }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month, user_id)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_month ON leaderboard_monthly(month);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON leaderboard_monthly(month, rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_points ON leaderboard_monthly(month, points DESC);

-- ============================================
-- 7. APP EVENTS (Tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS app_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Allow anonymous
  event_name TEXT NOT NULL,
  props JSONB DEFAULT '{}'::jsonb,
  session_id TEXT,
  page_path TEXT,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_events_user ON app_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_app_events_name ON app_events(event_name);
CREATE INDEX IF NOT EXISTS idx_app_events_created ON app_events(created_at);
CREATE INDEX IF NOT EXISTS idx_app_events_session ON app_events(session_id) WHERE session_id IS NOT NULL;

-- ============================================
-- 8. EXCHANGE CONNECTIONS (Encrypted storage)
-- ============================================
CREATE TABLE IF NOT EXISTS exchange_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exchange TEXT NOT NULL CHECK (exchange IN ('binance', 'coinbase', 'kraken')),
  api_key TEXT NOT NULL, -- Can be stored plain (read-only key) or hashed identifier
  api_secret_ciphertext TEXT NOT NULL, -- Encrypted secret
  api_secret_nonce TEXT NOT NULL, -- Nonce for decryption
  permissions JSONB DEFAULT '{"spot": true, "margin": false, "futures": false}'::jsonb,
  is_testnet BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  last_validated_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  UNIQUE(user_id, exchange)
);

CREATE INDEX IF NOT EXISTS idx_exchange_connections_user ON exchange_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_exchange_connections_active ON exchange_connections(user_id, is_active) WHERE is_active = true;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Profiles: Users can only see/update own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Quiz attempts: Users see own attempts
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own quiz attempts" ON quiz_attempts;
CREATE POLICY "Users can view own quiz attempts"
  ON quiz_attempts FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own quiz attempts" ON quiz_attempts;
CREATE POLICY "Users can insert own quiz attempts"
  ON quiz_attempts FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Quizzes: Public read
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Quizzes are public readable" ON quizzes;
CREATE POLICY "Quizzes are public readable"
  ON quizzes FOR SELECT
  TO authenticated, anon
  USING (true);

-- Learning events: Users insert own, view own
ALTER TABLE learning_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own learning events" ON learning_events;
CREATE POLICY "Users can view own learning events"
  ON learning_events FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own learning events" ON learning_events;
CREATE POLICY "Users can insert own learning events"
  ON learning_events FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Leaderboard: Public read (anonymized)
ALTER TABLE leaderboard_monthly ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leaderboard is public readable" ON leaderboard_monthly;
CREATE POLICY "Leaderboard is public readable"
  ON leaderboard_monthly FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Users can identify self in leaderboard" ON leaderboard_monthly;
CREATE POLICY "Users can identify self in leaderboard"
  ON leaderboard_monthly FOR SELECT
  USING (auth.uid() = id);

-- App events: Users insert own, view own (admins can view all via service role)
ALTER TABLE app_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own events" ON app_events;
CREATE POLICY "Users can view own events"
  ON app_events FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own events" ON app_events;
CREATE POLICY "Users can insert own events"
  ON app_events FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Anonymous can insert events" ON app_events;
CREATE POLICY "Anonymous can insert events"
  ON app_events FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- Exchange connections: Users cannot read encrypted secrets directly
ALTER TABLE exchange_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own connections (no secrets)" ON exchange_connections;
CREATE POLICY "Users can view own connections (no secrets)"
  ON exchange_connections FOR SELECT
  USING (auth.uid() = id);

-- Secrets only accessible via security definer functions

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, 
    display_name, 
    subscription_tier, 
    subscription_status,
    trial_started_at,
    trial_ends_at,
    referral_code
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'free',
    'trial',
    NOW(),
    NOW() + INTERVAL '14 days',
    encode(gen_random_bytes(6), 'hex')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger (enable in supabase dashboard or run separately)
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION public.handle_new_user();

-- Check entitlements for user
CREATE OR REPLACE FUNCTION get_user_entitlements(p_user_id UUID)
RETURNS TABLE (
  subscription_tier TEXT,
  subscription_status TEXT,
  is_trial_active BOOLEAN,
  is_trial_expired BOOLEAN,
  can_access_spot BOOLEAN,
  can_access_futures BOOLEAN,
  can_use_sms BOOLEAN,
  can_use_autotrade BOOLEAN,
  can_use_copy_trading BOOLEAN,
  can_use_limit_orders BOOLEAN,
  can_use_margin BOOLEAN,
  futures_quiz_passed BOOLEAN,
  trial_days_remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.subscription_tier,
    e.subscription_status,
    e.is_trial_active,
    e.is_trial_expired,
    e.can_access_spot,
    e.can_access_futures,
    e.can_use_sms,
    e.can_use_autotrade,
    e.can_use_copy_trading,
    e.can_use_limit_orders,
    e.can_use_margin,
    e.futures_quiz_passed,
    CASE 
      WHEN e.trial_ends_at > NOW() THEN EXTRACT(DAY FROM (e.trial_ends_at - NOW()))::INTEGER
      ELSE 0
    END as trial_days_remaining
  FROM user_entitlements e
  WHERE e.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record app event
CREATE OR REPLACE FUNCTION record_app_event(
  p_user_id UUID,
  p_event_name TEXT,
  p_props JSONB DEFAULT '{}'::jsonb,
  p_session_id TEXT DEFAULT NULL,
  p_page_path TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO app_events (user_id, event_name, props, session_id, page_path)
  VALUES (p_user_id, p_event_name, p_props, p_session_id, p_page_path)
  RETURNING id INTO v_event_id;
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Store exchange secret (to be called from Edge Function with encryption)
CREATE OR REPLACE FUNCTION store_exchange_connection(
  p_user_id UUID,
  p_exchange TEXT,
  p_api_key TEXT,
  p_api_secret_ciphertext TEXT,
  p_api_secret_nonce TEXT,
  p_permissions JSONB DEFAULT '{"spot": true}'::jsonb,
  p_is_testnet BOOLEAN DEFAULT true
)
RETURNS UUID AS $$
DECLARE
  v_connection_id UUID;
BEGIN
  INSERT INTO exchange_connections (
    user_id,
    exchange,
    api_key,
    api_secret_ciphertext,
    api_secret_nonce,
    permissions,
    is_testnet,
    last_validated_at
  )
  VALUES (
    p_user_id,
    p_exchange,
    p_api_key,
    p_api_secret_ciphertext,
    p_api_secret_nonce,
    p_permissions,
    p_is_testnet,
    NOW()
  )
  ON CONFLICT (user_id, exchange) 
  DO UPDATE SET
    api_key = EXCLUDED.api_key,
    api_secret_ciphertext = EXCLUDED.api_secret_ciphertext,
    api_secret_nonce = EXCLUDED.api_secret_nonce,
    permissions = EXCLUDED.permissions,
    is_testnet = EXCLUDED.is_testnet,
    last_validated_at = NOW(),
    is_active = true,
    revoked_at = NULL
  RETURNING id INTO v_connection_id;
  
  RETURN v_connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Compute leaderboard for month
CREATE OR REPLACE FUNCTION compute_leaderboard_monthly(p_month DATE DEFAULT DATE_TRUNC('month', NOW())::DATE)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Calculate points for each user
  WITH user_points AS (
    SELECT 
      user_id,
      SUM(points) as total_points,
      jsonb_build_object(
        'modules_completed', COUNT(*) FILTER (WHERE event_type = 'module_completed'),
        'quizzes_passed', COUNT(*) FILTER (WHERE event_type = 'quiz_passed'),
        'trades_count', COUNT(*) FILTER (WHERE event_type IN ('paper_trade_closed_profit', 'paper_trade_closed_loss')),
        'win_rate', CASE 
          WHEN COUNT(*) FILTER (WHERE event_type IN ('paper_trade_closed_profit', 'paper_trade_closed_loss')) > 0 
          THEN (COUNT(*) FILTER (WHERE event_type = 'paper_trade_closed_profit')::FLOAT / 
                COUNT(*) FILTER (WHERE event_type IN ('paper_trade_closed_profit', 'paper_trade_closed_loss'))) * 100
          ELSE 0
        END
      ) as stats
    FROM learning_events
    WHERE created_at >= p_month 
      AND created_at < p_month + INTERVAL '1 month'
    GROUP BY user_id
  ),
  ranked AS (
    SELECT 
      user_id,
      total_points,
      stats,
      ROW_NUMBER() OVER (ORDER BY total_points DESC) as rank_num
    FROM user_points
  )
  INSERT INTO leaderboard_monthly (month, user_id, display_name, points, rank, stats)
  SELECT 
    p_month,
    r.user_id,
    p.display_name,
    r.total_points,
    r.rank_num,
    r.stats
  FROM ranked r
  JOIN profiles p ON r.user_id = p.id
  ON CONFLICT (month, user_id) 
  DO UPDATE SET
    points = EXCLUDED.points,
    rank = EXCLUDED.rank,
    stats = EXCLUDED.stats,
    updated_at = NOW();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set subscription tier (admin/testing)
CREATE OR REPLACE FUNCTION set_subscription_tier(
  p_user_id UUID,
  p_tier TEXT,
  p_status TEXT DEFAULT 'active'
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE profiles
  SET 
    subscription_tier = p_tier,
    subscription_status = p_status,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Award points for learning event
CREATE OR REPLACE FUNCTION award_learning_points(
  p_user_id UUID,
  p_event_type TEXT,
  p_points INTEGER DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_points INTEGER;
  v_event_id UUID;
BEGIN
  -- Default points by event type
  v_points := COALESCE(p_points, CASE p_event_type
    WHEN 'module_completed' THEN 10
    WHEN 'quiz_passed' THEN 25
    WHEN 'quiz_perfect_score' THEN 50
    WHEN 'risk_rule_followed' THEN 15
    WHEN 'paper_trade_closed_profit' THEN 20
    WHEN 'paper_trade_closed_loss' THEN 5  -- Still award for learning from loss
    WHEN 'daily_login' THEN 2
    WHEN 'referral_signup' THEN 100
    ELSE 5
  END);
  
  INSERT INTO learning_events (user_id, event_type, points, metadata)
  VALUES (p_user_id, p_event_type, v_points, p_metadata)
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quizzes_updated_at ON quizzes;
CREATE TRIGGER update_quizzes_updated_at
  BEFORE UPDATE ON quizzes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leaderboard_updated_at ON leaderboard_monthly;
CREATE TRIGGER update_leaderboard_updated_at
  BEFORE UPDATE ON leaderboard_monthly
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exchange_connections_updated_at ON exchange_connections;
CREATE TRIGGER update_exchange_connections_updated_at
  BEFORE UPDATE ON exchange_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS FOR CONVENIENCE
-- ============================================

-- Current month leaderboard with rank
CREATE OR REPLACE VIEW current_leaderboard AS
SELECT 
  lm.month,
  lm.rank,
  lm.display_name,
  lm.points,
  lm.stats,
  lm.user_id,
  p.subscription_tier
FROM leaderboard_monthly lm
JOIN profiles p ON lm.user_id = p.id
WHERE lm.month = DATE_TRUNC('month', NOW())::DATE
ORDER BY lm.rank ASC;

-- User stats summary
CREATE OR REPLACE VIEW user_stats_summary AS
SELECT 
  p.id,
  p.display_name,
  p.subscription_tier,
  p.subscription_status,
  p.trial_ends_at,
  COALESCE((SELECT SUM(points) FROM learning_events le WHERE le.user_id = p.id AND le.created_at >= DATE_TRUNC('month', NOW())), 0) as monthly_points,
  COALESCE((SELECT SUM(points) FROM learning_events le WHERE le.user_id = p.id), 0) as total_points,
  (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.user_id = p.id AND qa.passed = true) as quizzes_passed,
  (SELECT bool_or(passed) FROM quiz_attempts qa JOIN quizzes q ON qa.quiz_id = q.id WHERE qa.user_id = p.id AND q.slug = 'futures') as futures_quiz_passed
FROM profiles p;
