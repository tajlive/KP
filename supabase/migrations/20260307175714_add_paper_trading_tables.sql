-- KLA-154: Add paper trading tables for production launch
-- Created: 2026-03-07

-- ============================================================================
-- 1. PAPER TRADING SESSIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS paper_trading_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  starting_balance DECIMAL(20,8) DEFAULT 100000.00,
  current_balance DECIMAL(20,8) DEFAULT 100000.00,
  total_pnl DECIMAL(20,8) DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('active', 'paused', 'completed')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, status)
);

CREATE INDEX IF NOT EXISTS idx_paper_trading_sessions_user_id 
  ON paper_trading_sessions(user_id);

-- RLS
ALTER TABLE paper_trading_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own paper sessions" ON paper_trading_sessions;
CREATE POLICY "Users manage own paper sessions" 
  ON paper_trading_sessions FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 2. RISK PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS risk_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL CHECK (name IN ('forsiktig', 'moderat', 'aggressiv')),
  max_position_size_pct DECIMAL(5,2) NOT NULL,
  stop_loss_pct DECIMAL(5,2) NOT NULL,
  max_total_exposure_pct DECIMAL(5,2) NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_risk_profiles_user_id 
  ON risk_profiles(user_id);

-- RLS
ALTER TABLE risk_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own risk profiles" ON risk_profiles;
CREATE POLICY "Users manage own risk profiles" 
  ON risk_profiles FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 3. AUTO TRADING CONFIGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS auto_trading_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  risk_profile_id UUID REFERENCES risk_profiles(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT false,
  strategy TEXT NOT NULL CHECK (strategy IN ('dca', 'grid', 'momentum', 'combined')),
  config JSONB DEFAULT '{}',
  last_executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auto_trading_configs_user_id 
  ON auto_trading_configs(user_id);

-- RLS
ALTER TABLE auto_trading_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own auto trading" ON auto_trading_configs;
CREATE POLICY "Users manage own auto trading" 
  ON auto_trading_configs FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 4. AUTO-CREATE DEFAULT DATA FOR NEW USERS
-- ============================================================================
CREATE OR REPLACE FUNCTION create_default_user_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Create paper trading session
  INSERT INTO paper_trading_sessions (user_id, starting_balance, current_balance)
  VALUES (NEW.id, 100000, 100000)
  ON CONFLICT DO NOTHING;
  
  -- Create default risk profiles
  INSERT INTO risk_profiles (user_id, name, max_position_size_pct, stop_loss_pct, max_total_exposure_pct, is_active) VALUES
    (NEW.id, 'forsiktig', 2.0, 3.0, 5.0, true),
    (NEW.id, 'moderat', 5.0, 5.0, 15.0, false),
    (NEW.id, 'aggressiv', 10.0, 10.0, 30.0, false)
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_user_data();

-- ============================================================================
-- 5. UPDATE EXISTING USERS
-- ============================================================================
-- Create paper trading sessions for existing users without one
INSERT INTO paper_trading_sessions (user_id, starting_balance, current_balance)
SELECT id, 100000, 100000
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM paper_trading_sessions WHERE user_id = auth.users.id
)
ON CONFLICT DO NOTHING;

-- Create risk profiles for existing users
INSERT INTO risk_profiles (user_id, name, max_position_size_pct, stop_loss_pct, max_total_exposure_pct, is_active)
SELECT 
  u.id,
  r.name,
  r.max_position_size_pct,
  r.stop_loss_pct,
  r.max_total_exposure_pct,
  r.is_active
FROM auth.users u
CROSS JOIN (VALUES 
  ('forsiktig', 2.0, 3.0, 5.0, true),
  ('moderat', 5.0, 5.0, 15.0, false),
  ('aggressiv', 10.0, 10.0, 30.0, false)
) AS r(name, max_position_size_pct, stop_loss_pct, max_total_exposure_pct, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM risk_profiles rp WHERE rp.user_id = u.id AND rp.name = r.name
)
ON CONFLICT DO NOTHING;
