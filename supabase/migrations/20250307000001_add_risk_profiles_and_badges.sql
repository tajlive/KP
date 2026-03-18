-- ============================================================================
-- KLA-133: Risk Profiles and Badges
-- ============================================================================

-- Risk Profiles Table
CREATE TABLE IF NOT EXISTS risk_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (name IN ('forsiktig', 'moderat', 'aggressiv', 'tilpasset')),
  max_position_pct DECIMAL DEFAULT 5.0,
  max_exposure_pct DECIMAL DEFAULT 15.0,
  max_daily_loss_pct DECIMAL DEFAULT 3.0,
  allowed_pairs TEXT[] DEFAULT '{"BTCUSDT","ETHUSDT"}',
  leverage_allowed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_risk_profiles_user_id ON risk_profiles(user_id);
-- RLS
ALTER TABLE risk_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own risk profile"
  ON risk_profiles FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can update own risk profile"
  ON risk_profiles FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Service can insert risk profiles"
  ON risk_profiles FOR INSERT
  WITH CHECK (true);
-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_risk_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_risk_profiles_timestamp ON risk_profiles;
CREATE TRIGGER update_risk_profiles_timestamp
  BEFORE UPDATE ON risk_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_risk_profiles_updated_at();
-- Badges Table
CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY,
  name_no TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_no TEXT,
  description_en TEXT,
  icon TEXT NOT NULL,
  xp_reward INTEGER DEFAULT 0,
  condition_type TEXT NOT NULL,
  condition_value JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- User Badges (earned)
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES badges(id),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);
-- RLS
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view badges"
  ON badges FOR SELECT
  TO authenticated, anon
  USING (true);
CREATE POLICY "Users can view own badges"
  ON user_badges FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Service can award badges"
  ON user_badges FOR INSERT
  WITH CHECK (true);
-- Seed Badges
INSERT INTO badges (id, name_no, name_en, description_no, description_en, icon, xp_reward, condition_type) VALUES
  ('first_trade', 'Første Trade', 'First Trade', 'Utfør din første paper trade', 'Execute your first paper trade', 'Target', 100, 'trade_count'),
  ('bokorm', 'Bokorm', 'Bookworm', 'Fullfør 5 leksjoner', 'Complete 5 lessons', 'BookOpen', 200, 'lessons_complete'),
  ('streak_7', '7-dagers Streak', '7-Day Streak', 'Logg inn 7 dager på rad', 'Login 7 days in a row', 'Zap', 500, 'login_streak'),
  ('diamanthender', 'Diamanthender', 'Diamond Hands', 'Hold en posisjon i 30 dager', 'Hold a position for 30 days', 'Gem', 300, 'hold_duration'),
  ('topp_10', 'Topp 10', 'Top 10', 'Nå topp 10 på leaderboard', 'Reach top 10 on leaderboard', 'Trophy', 1000, 'leaderboard_rank'),
  ('quiz_master', 'Quiz Master', 'Quiz Master', 'Bestå 10 quizer', 'Pass 10 quizzes', 'Brain', 400, 'quiz_pass'),
  ('profitt_pro', 'Profitt Pro', 'Profit Pro', 'Gjør 10% profitt på paper trading', 'Make 10% profit on paper trading', 'TrendingUp', 500, 'profit_percent'),
  ('founder', 'Grunnlegger', 'Founder', 'Blant de første 100 studentene', 'Among the first 100 students', 'Crown', 10000, 'founder')
ON CONFLICT (id) DO NOTHING;
-- Function to create default risk profile for new users
CREATE OR REPLACE FUNCTION create_default_risk_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO risk_profiles (user_id, name, max_position_pct, max_exposure_pct, max_daily_loss_pct)
  VALUES (NEW.id, 'moderat', 5.0, 15.0, 3.0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Trigger to create risk profile on user creation
DROP TRIGGER IF EXISTS create_risk_profile_on_signup ON auth.users;
CREATE TRIGGER create_risk_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_risk_profile();
