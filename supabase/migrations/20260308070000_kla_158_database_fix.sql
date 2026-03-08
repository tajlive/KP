-- KLA-158 Part 1: Database Fix Consolidation
-- Dette sikrer at alle 4 kritiske tabeller er korrekt opprettet med RLS og triggers.

-- 1. RISK PROFILES
CREATE TABLE IF NOT EXISTS risk_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL CHECK (name IN ('forsiktig', 'moderat', 'aggressiv')),
  max_position_size_pct DECIMAL(5,2) NOT NULL,
  stop_loss_pct DECIMAL(5,2) NOT NULL,
  max_total_exposure_pct DECIMAL(5,2) NOT NULL,
  is_active BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- 2. PAPER TRADING SESSIONS
CREATE TABLE IF NOT EXISTS paper_trading_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  starting_balance DECIMAL(20,8) DEFAULT 100000.00,
  current_balance DECIMAL(20,8) DEFAULT 100000.00,
  total_pnl DECIMAL(20,8) DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, is_active)
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

-- 4. TRADING SESSIONS
CREATE TABLE IF NOT EXISTS trading_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode            TEXT NOT NULL DEFAULT 'paper',
  status          TEXT NOT NULL DEFAULT 'active',
  trading_pair    TEXT NOT NULL DEFAULT 'BTC/USDT',
  current_capital NUMERIC(15,2) NOT NULL DEFAULT 100000.00,
  initial_capital NUMERIC(15,2) NOT NULL DEFAULT 100000.00,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS Enablement
ALTER TABLE risk_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_trading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_trading_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users manage own risk profiles" ON risk_profiles;
CREATE POLICY "Users manage own risk profiles" ON risk_profiles FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own paper sessions" ON paper_trading_sessions;
CREATE POLICY "Users manage own paper sessions" ON paper_trading_sessions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own auto trading" ON auto_trading_configs;
CREATE POLICY "Users manage own auto trading" ON auto_trading_configs FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own sessions" ON trading_sessions;
CREATE POLICY "Users manage own sessions" ON trading_sessions FOR ALL USING (auth.uid() = user_id);

-- AUTO-CREATE TRIGGER
CREATE OR REPLACE FUNCTION handle_new_user_onboarding_kla158()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Create default paper trading session
  INSERT INTO paper_trading_sessions (user_id, starting_balance, current_balance, is_active)
  VALUES (NEW.id, 100000, 100000, true)
  ON CONFLICT DO NOTHING;
  
  -- 2. Create default risk profiles
  INSERT INTO risk_profiles (user_id, name, max_position_size_pct, stop_loss_pct, max_total_exposure_pct, is_active, is_default) VALUES
    (NEW.id, 'forsiktig', 2.0, 3.0, 5.0, true, true),
    (NEW.id, 'moderat', 5.0, 5.0, 15.0, false, false),
    (NEW.id, 'aggressiv', 10.0, 10.0, 30.0, false, false)
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_kla158 ON auth.users;
CREATE TRIGGER on_auth_user_created_kla158
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_onboarding_kla158();
