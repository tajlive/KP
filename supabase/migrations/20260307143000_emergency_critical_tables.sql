-- ===============================================
-- EMERGENCY: Critical tables for tonight's test
-- ===============================================

-- 1. PAPER TRADING SESSIONS
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

-- 2. RISK PROFILES
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

-- 3. AUTO TRADING CONFIGS
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

-- RLS POLICIES
ALTER TABLE paper_trading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_trading_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own paper sessions" 
  ON paper_trading_sessions FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own risk profiles" 
  ON risk_profiles FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own auto trading" 
  ON auto_trading_configs FOR ALL USING (auth.uid() = user_id);

-- AUTO-CREATE DEFAULT DATA
CREATE OR REPLACE FUNCTION create_default_user_data()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO paper_trading_sessions (user_id, starting_balance, current_balance)
  VALUES (NEW.id, 100000, 100000);
  
  INSERT INTO risk_profiles (user_id, name, max_position_size_pct, stop_loss_pct, max_total_exposure_pct, is_active) VALUES
    (NEW.id, 'forsiktig', 2.0, 3.0, 5.0, true),
    (NEW.id, 'moderat', 5.0, 5.0, 15.0, false),
    (NEW.id, 'aggressiv', 10.0, 10.0, 30.0, false);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_user_data();
