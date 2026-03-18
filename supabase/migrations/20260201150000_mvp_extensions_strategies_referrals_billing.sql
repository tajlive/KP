-- MVP Extensions: Strategies, Referrals, Billing, Quiz Questions
-- Complete schema for Fase 1 MVP

-- ============================================
-- 1. QUIZ QUESTIONS (for quiz content)
-- ============================================
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false')),
  options JSONB NOT NULL, -- [{"text": "...", "is_correct": true/false}]
  explanation TEXT, -- Shown after answering
  points INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_quiz_questions_quiz ON quiz_questions(quiz_id);
CREATE INDEX idx_quiz_questions_number ON quiz_questions(quiz_id, question_number);
-- Insert sample Futures Quiz questions
DO $$
DECLARE
  futures_quiz_id UUID;
BEGIN
  SELECT id INTO futures_quiz_id FROM quizzes WHERE slug = 'futures';
  
  IF futures_quiz_id IS NOT NULL THEN
    INSERT INTO quiz_questions (quiz_id, question_number, question_text, question_type, options, explanation, points)
    VALUES
      (futures_quiz_id, 1, 
       'Hva er hovedforskjellen mellom spot trading og futures trading?',
       'multiple_choice',
       '[{"text": "Futures handles på børs, spot OTC", "is_correct": false}, {"text": "Futures er kontrakter for fremtidig levering, spot er umiddelbar", "is_correct": true}, {"text": "Futures er kun for krypto, spot for aksjer", "is_correct": false}, {"text": "Ingen forskjell, bare forskjellig navn", "is_correct": false}]'::jsonb,
       'Futures er avtaler om å kjøpe/selge til en fremtidig dato og pris. Spot er umiddelbar levering.',
       1),
      
      (futures_quiz_id, 2,
       'Hva betegnes som "liquidation" i futures trading?',
       'multiple_choice',
       '[{"text": "Når du selger med profitt", "is_correct": false}, {"text": "Når posisjonen tvangslukkes pga margin call", "is_correct": true}, {"text": "Når markedet stenger", "is_correct": false}, {"text": "Når du kjøper mer", "is_correct": false}]'::jsonb,
       'Liquidation skjer når prisen beveger seg mot deg og marginen er oppbrukt. Positions lukkes automatisk.',
       1),
      
      (futures_quiz_id, 3,
       'Hva er funding rate i perpetual futures?',
       'multiple_choice',
       '[{"text": "Gebyr for å åpne posisjon", "is_correct": false}, {"text": "Periodisk betaling mellom long og short for å holde prisen nær spot", "is_correct": true}, {"text": "Rente på lånt kapital", "is_correct": false}, {"text": "Skatt på profitt", "is_correct": false}]'::jsonb,
       'Funding rate betales hver 8. time for å holde perpetual futures prisen justert mot spot markedet.',
       1),
      
      (futures_quiz_id, 4,
       'Hva er initial margin?',
       'multiple_choice',
       '[{"text": "Total verdi av posisjonen", "is_correct": false}, {"text": "Minimum kapital påkrevd for å åpne en posisjon", "is_correct": true}, {"text": "Gebyr til megler", "is_correct": false}, {"text": "Profitt fra forrige trade", "is_correct": false}]'::jsonb,
       'Initial margin er minimumsbeløpet du må sette inn for å åpne en leveraged posisjon.',
       1),
      
      (futures_quiz_id, 5,
       'Hva er maintenance margin?',
       'multiple_choice',
       '[{"text": "Samme som initial margin", "is_correct": false}, {"text": "Minimum margin som må opprettholdes for å unngå liquidation", "is_correct": true}, {"text": "Maksimal margin tillatt", "is_correct": false}, {"text": "Margin for vedlikehold av konto", "is_correct": false}]'::jsonb,
       'Maintenance margin er grensen hvor liquidation trigges. Lavere enn initial margin.',
       1),
      
      (futures_quiz_id, 6,
       'Hva skjer ved 10x leverage hvis prisen beveger seg 10% mot deg?',
       'multiple_choice',
       '[{"text": "10% tap", "is_correct": false}, {"text": "50% tap", "is_correct": false}, {"text": "100% tap (liquidation)", "is_correct": true}, {"text": "Ingen effekt", "is_correct": false}]'::jsonb,
       'Med 10x leverage forsterkes bevegelsen 10x. 10% mot deg = 100% tap = liquidation.',
       2)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
-- ============================================
-- 2. STRATEGIES (for copy trading)
-- ============================================
CREATE TABLE IF NOT EXISTS strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  strategy_type TEXT CHECK (strategy_type IN ('manual', 'automated', 'hybrid')) DEFAULT 'manual',
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')) DEFAULT 'medium',
  is_public BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Performance metrics (updated periodically)
  total_return_percent DECIMAL(8, 2) DEFAULT 0,
  win_rate DECIMAL(5, 2) DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  avg_trade_duration_hours DECIMAL(8, 2),
  max_drawdown_percent DECIMAL(8, 2),
  sharpe_ratio DECIMAL(6, 2),
  
  -- Subscription fees (for paid strategies)
  subscription_fee_monthly DECIMAL(10, 2) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_strategy_name UNIQUE(user_id, name)
);
CREATE INDEX idx_strategies_user ON strategies(user_id);
CREATE INDEX idx_strategies_public ON strategies(is_public, is_active) WHERE is_public = true AND is_active = true;
CREATE INDEX idx_strategies_return ON strategies(total_return_percent) WHERE is_public = true;
-- ============================================
-- 3. STRATEGY FOLLOWERS (copy trading relationships)
-- ============================================
CREATE TABLE IF NOT EXISTS strategy_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
  follower_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Copy settings
  allocation_percent DECIMAL(5, 2) DEFAULT 100, -- How much of follower's capital to allocate
  max_position_size_usd DECIMAL(12, 2),
  stop_loss_percent DECIMAL(5, 2) DEFAULT 10, -- Auto-unfollow if strategy loses X%
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  end_reason TEXT, -- 'user_choice', 'stop_loss', 'strategy_closed', 'subscription_ended'
  
  -- Performance for this follower
  follower_return_usd DECIMAL(12, 2) DEFAULT 0,
  follower_return_percent DECIMAL(8, 2) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(strategy_id, follower_user_id)
);
CREATE INDEX idx_strategy_followers_strategy ON strategy_followers(strategy_id);
CREATE INDEX idx_strategy_followers_follower ON strategy_followers(follower_user_id);
CREATE INDEX idx_strategy_followers_active ON strategy_followers(follower_user_id, is_active) WHERE is_active = true;
-- ============================================
-- 4. REFERRAL TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS referral_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Null until user signs up
  
  -- Tracking info
  referral_code TEXT NOT NULL,
  source TEXT DEFAULT 'direct', -- 'direct', 'email', 'social', 'banner'
  landing_page TEXT DEFAULT '/',
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'trial_completed', 'converted', 'expired')),
  
  -- Conversion tracking
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  signed_up_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  
  -- Rewards
  referrer_reward_points INTEGER DEFAULT 0,
  referrer_reward_months INTEGER DEFAULT 0, -- Free months awarded
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_referral_tracking_referrer ON referral_tracking(referrer_user_id);
CREATE INDEX idx_referral_tracking_code ON referral_tracking(referral_code);
CREATE INDEX idx_referral_tracking_referred ON referral_tracking(referred_user_id) WHERE referred_user_id IS NOT NULL;
CREATE INDEX idx_referral_tracking_status ON referral_tracking(status);
-- ============================================
-- 5. BILLING EVENTS
-- ============================================
CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Event details
  event_type TEXT NOT NULL CHECK (event_type IN (
    'trial_started',
    'trial_expired',
    'subscription_started',
    'subscription_renewed',
    'subscription_canceled',
    'subscription_expired',
    'plan_upgraded',
    'plan_downgraded',
    'payment_succeeded',
    'payment_failed',
    'refund_issued'
  )),
  
  -- Plan info at time of event
  from_tier TEXT,
  to_tier TEXT,
  
  -- Payment info
  amount_nok DECIMAL(10, 2),
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_billing_events_user ON billing_events(user_id);
CREATE INDEX idx_billing_events_type ON billing_events(event_type);
CREATE INDEX idx_billing_events_created ON billing_events(created_at);
-- ============================================
-- 6. USER NOTIFICATION PREFERENCES
-- ============================================
CREATE TABLE IF NOT EXISTS user_notification_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Push notifications
  push_enabled BOOLEAN DEFAULT true,
  push_signals BOOLEAN DEFAULT true,
  push_price_alerts BOOLEAN DEFAULT true,
  push_market_updates BOOLEAN DEFAULT false,
  
  -- Email notifications
  email_enabled BOOLEAN DEFAULT true,
  email_signals BOOLEAN DEFAULT true,
  email_weekly_report BOOLEAN DEFAULT true,
  email_marketing BOOLEAN DEFAULT false,
  
  -- SMS notifications (tier-gated)
  sms_enabled BOOLEAN DEFAULT false,
  sms_signals BOOLEAN DEFAULT false,
  sms_price_alerts BOOLEAN DEFAULT false,
  
  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- ============================================
-- 7. USER SETTINGS (Extended)
-- ============================================
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Safe mode
  safe_mode_enabled BOOLEAN DEFAULT true,
  
  -- Autotrade settings
  autotrade_enabled BOOLEAN DEFAULT false,
  autotrade_max_position_percent DECIMAL(5, 2) DEFAULT 20,
  autotrade_max_daily_trades INTEGER DEFAULT 5,
  autotrade_stop_loss_percent DECIMAL(5, 2) DEFAULT 5,
  autotrade_take_profit_percent DECIMAL(5, 2) DEFAULT 10,
  
  -- UI preferences
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'system')),
  language TEXT DEFAULT 'no' CHECK (language IN ('no', 'en')),
  
  -- Privacy
  show_in_leaderboard BOOLEAN DEFAULT true,
  allow_copy_trading BOOLEAN DEFAULT false,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- ============================================
-- RLS POLICIES
-- ============================================

-- Quiz questions: Public read
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quiz questions are public readable"
  ON quiz_questions FOR SELECT
  TO authenticated, anon
  USING (true);
-- Strategies: Public can view public strategies
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view public strategies"
  ON strategies FOR SELECT
  TO authenticated
  USING (is_public = true OR user_id = auth.uid());
CREATE POLICY "Users can manage own strategies"
  ON strategies FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
-- Strategy followers: Users manage own follows
ALTER TABLE strategy_followers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own follows"
  ON strategy_followers FOR SELECT
  TO authenticated
  USING (follower_user_id = auth.uid());
CREATE POLICY "Users can follow/unfollow strategies"
  ON strategy_followers FOR INSERT
  TO authenticated
  WITH CHECK (follower_user_id = auth.uid());
CREATE POLICY "Users can update own follows"
  ON strategy_followers FOR UPDATE
  TO authenticated
  USING (follower_user_id = auth.uid());
-- Referral tracking: Users view own referrals
ALTER TABLE referral_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own referrals"
  ON referral_tracking FOR SELECT
  TO authenticated
  USING (referrer_user_id = auth.uid());
-- Billing events: Users view own billing
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own billing events"
  ON billing_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
-- Notification settings: Users manage own
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own notification settings"
  ON user_notification_settings FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
-- User settings: Users manage own
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own settings"
  ON user_settings FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
-- ============================================
-- VIEWS
-- ============================================

-- Public strategies with creator info
CREATE OR REPLACE VIEW public_strategies AS
SELECT 
  s.id,
  s.name,
  s.description,
  s.strategy_type,
  s.risk_level,
  s.total_return_percent,
  s.win_rate,
  s.total_trades,
  s.subscription_fee_monthly,
  p.display_name as creator_name,
  p.subscription_tier as creator_tier,
  (SELECT COUNT(*) FROM strategy_followers sf WHERE sf.strategy_id = s.id AND sf.is_active = true) as follower_count
FROM strategies s
JOIN profiles p ON s.user_id = p.id
WHERE s.is_public = true AND s.is_active = true;
-- User referrals summary
CREATE OR REPLACE VIEW user_referrals_summary AS
SELECT 
  rt.referrer_user_id,
  COUNT(*) as total_referrals,
  COUNT(*) FILTER (WHERE rt.status = 'signed_up') as signed_up_count,
  COUNT(*) FILTER (WHERE rt.status = 'converted') as converted_count,
  SUM(rt.referrer_reward_points) as total_points_earned,
  SUM(rt.referrer_reward_months) as total_free_months
FROM referral_tracking rt
GROUP BY rt.referrer_user_id;
-- Update entitlements view to include strategies
CREATE OR REPLACE VIEW user_entitlements AS
WITH quiz_status AS (
  SELECT 
    user_id,
    bool_or(passed) FILTER (WHERE q.slug = 'futures') AS futures_quiz_passed
  FROM quiz_attempts qa
  JOIN quizzes q ON qa.quiz_id = q.id
  WHERE qa.passed = true
  GROUP BY user_id
),
strategy_count AS (
  SELECT 
    user_id,
    COUNT(*) as active_strategies
  FROM strategies
  WHERE is_active = true
  GROUP BY user_id
)
SELECT 
  p.id,
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
  p.subscription_tier IN ('standard', 'pluss', 'vip_ekstrem') AS can_create_strategies,
  COALESCE(qs.futures_quiz_passed, false) AS futures_quiz_passed,
  COALESCE(sc.active_strategies, 0) as active_strategies
FROM profiles p
LEFT JOIN quiz_status qs ON p.id = qs.user_id
LEFT JOIN strategy_count sc ON p.id = sc.user_id;
-- ============================================
-- FUNCTIONS
-- ============================================

-- Record billing event
CREATE OR REPLACE FUNCTION record_billing_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_from_tier TEXT DEFAULT NULL,
  p_to_tier TEXT DEFAULT NULL,
  p_amount_nok DECIMAL DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO billing_events (user_id, event_type, from_tier, to_tier, amount_nok, metadata)
  VALUES (p_user_id, p_event_type, p_from_tier, p_to_tier, p_amount_nok, p_metadata)
  RETURNING id INTO v_event_id;
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Track referral click (anonymous allowed)
CREATE OR REPLACE FUNCTION track_referral_click(
  p_referral_code TEXT,
  p_source TEXT DEFAULT 'direct',
  p_landing_page TEXT DEFAULT '/',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_tracking_id UUID;
  v_referrer_id UUID;
BEGIN
  -- Find referrer by code
  SELECT user_id INTO v_referrer_id 
  FROM profiles 
  WHERE referral_code = p_referral_code;
  
  IF v_referrer_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  INSERT INTO referral_tracking (
    referrer_user_id, 
    referral_code, 
    source, 
    landing_page,
    ip_address,
    user_agent
  )
  VALUES (v_referrer_id, p_referral_code, p_source, p_landing_page, p_ip_address, p_user_agent)
  RETURNING id INTO v_tracking_id;
  
  RETURN v_tracking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Complete referral (when referred user signs up)
CREATE OR REPLACE FUNCTION complete_referral(
  p_referral_code TEXT,
  p_referred_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_referrer_id UUID;
  v_tracking_id UUID;
BEGIN
  -- Find the most recent pending tracking entry
  SELECT id, referrer_user_id INTO v_tracking_id, v_referrer_id
  FROM referral_tracking
  WHERE referral_code = p_referral_code
    AND status = 'pending'
  ORDER BY clicked_at DESC
  LIMIT 1;
  
  IF v_tracking_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Update tracking
  UPDATE referral_tracking
  SET 
    referred_user_id = p_referred_user_id,
    status = 'signed_up',
    signed_up_at = NOW()
  WHERE id = v_tracking_id;
  
  -- Award points to referrer
  PERFORM award_learning_points(v_referrer_id, 'referral_signup', 100, 
    jsonb_build_object('referred_user_id', p_referred_user_id));
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Get quiz with questions
CREATE OR REPLACE FUNCTION get_quiz_with_questions(p_quiz_slug TEXT)
RETURNS JSON AS $$
DECLARE
  v_quiz_id UUID;
  result JSON;
BEGIN
  SELECT id INTO v_quiz_id FROM quizzes WHERE slug = p_quiz_slug;
  
  IF v_quiz_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT json_build_object(
    'id', q.id,
    'slug', q.slug,
    'title', q.title,
    'description', q.description,
    'pass_score', q.pass_score,
    'is_required_for_futures', q.is_required_for_futures,
    'questions', (
      SELECT json_agg(
        json_build_object(
          'id', qq.id,
          'question_number', qq.question_number,
          'question_text', qq.question_text,
          'question_type', qq.question_type,
          'options', qq.options,
          'points', qq.points
        ) ORDER BY qq.question_number
      )
      FROM quiz_questions qq
      WHERE qq.quiz_id = q.id
    )
  )
  INTO result
  FROM quizzes q
  WHERE q.id = v_quiz_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Submit quiz attempt
CREATE OR REPLACE FUNCTION submit_quiz_attempt(
  p_user_id UUID,
  p_quiz_slug TEXT,
  p_answers JSONB -- [{"question_id": "...", "selected_option_index": 0}]
)
RETURNS JSON AS $$
DECLARE
  v_quiz_id UUID;
  v_quiz_record RECORD;
  v_correct_count INTEGER := 0;
  v_total_points INTEGER := 0;
  v_earned_points INTEGER := 0;
  v_score INTEGER;
  v_passed BOOLEAN;
  v_attempt_id UUID;
BEGIN
  -- Get quiz info
  SELECT * INTO v_quiz_record FROM quizzes WHERE slug = p_quiz_slug;
  
  IF v_quiz_record IS NULL THEN
    RETURN json_build_object('error', 'Quiz not found');
  END IF;
  
  v_quiz_id := v_quiz_record.id;
  
  -- Calculate score
  SELECT 
    COUNT(*) FILTER (WHERE 
      (opt->>'is_correct')::boolean = true
    ),
    SUM(qq.points)
  INTO v_correct_count, v_total_points
  FROM quiz_questions qq,
       jsonb_array_elements(qq.options) AS opt,
       jsonb_array_elements(p_answers) AS ans
  WHERE qq.quiz_id = v_quiz_id
    AND qq.id = (ans->>'question_id')::UUID
    AND (opt->>'text') = (
      SELECT (jsonb_array_elements(qq2.options)->>'text')
      FROM quiz_questions qq2
      WHERE qq2.id = (ans->>'question_id')::UUID
      LIMIT 1 OFFSET (ans->>'selected_option_index')::INTEGER
    );
  
  v_score := (v_correct_count::FLOAT / (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = v_quiz_id) * 100)::INTEGER;
  v_passed := v_score >= v_quiz_record.pass_score;
  
  -- Record attempt
  INSERT INTO quiz_attempts (user_id, quiz_id, score, passed, answers)
  VALUES (p_user_id, v_quiz_id, v_score, v_passed, p_answers)
  RETURNING id INTO v_attempt_id;
  
  -- Award points if passed
  IF v_passed THEN
    v_earned_points := CASE 
      WHEN v_score = 100 THEN 50  -- Perfect score bonus
      ELSE 25
    END;
    
    PERFORM award_learning_points(
      p_user_id, 
      CASE WHEN v_score = 100 THEN 'quiz_perfect_score' ELSE 'quiz_passed' END,
      v_earned_points,
      jsonb_build_object('quiz_slug', p_quiz_slug, 'score', v_score)
    );
  END IF;
  
  RETURN json_build_object(
    'attempt_id', v_attempt_id,
    'score', v_score,
    'passed', v_passed,
    'pass_score', v_quiz_record.pass_score,
    'points_earned', v_earned_points,
    'correct_count', v_correct_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER update_strategies_updated_at
  BEFORE UPDATE ON strategies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_strategy_followers_updated_at
  BEFORE UPDATE ON strategy_followers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_referral_tracking_updated_at
  BEFORE UPDATE ON referral_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_notification_settings_updated_at
  BEFORE UPDATE ON user_notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Initialize user settings on profile creation
CREATE OR REPLACE FUNCTION initialize_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_notification_settings (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO user_settings (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION initialize_user_settings();
