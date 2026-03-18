-- ============================================================================
-- EMERGENCY: KLA-154 Database Tabeller - P0 Blocker Fix
-- paper_trading_sessions, risk_profiles, auto_trading_configs
-- ============================================================================

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
COMMENT ON TABLE paper_trading_sessions IS 'Paper trading sessions for users';
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
COMMENT ON TABLE risk_profiles IS 'User risk profiles for auto-trading';
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
COMMENT ON TABLE auto_trading_configs IS 'Auto trading configuration per user';
-- RLS POLICIES
ALTER TABLE paper_trading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_trading_configs ENABLE ROW LEVEL SECURITY;
-- Drop existing policies
DROP POLICY IF EXISTS "Users manage own paper sessions" ON paper_trading_sessions;
DROP POLICY IF EXISTS "Users manage own risk profiles" ON risk_profiles;
DROP POLICY IF EXISTS "Users manage own auto trading" ON auto_trading_configs;
-- Create policies
CREATE POLICY "Users manage own paper sessions" 
  ON paper_trading_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own risk profiles" 
  ON risk_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own auto trading" 
  ON auto_trading_configs FOR ALL USING (auth.uid() = user_id);
-- Grants
GRANT ALL ON paper_trading_sessions TO authenticated, service_role;
GRANT ALL ON risk_profiles TO authenticated, service_role;
GRANT ALL ON auto_trading_configs TO authenticated, service_role;
-- Indexes
CREATE INDEX IF NOT EXISTS idx_paper_sessions_user_id ON paper_trading_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_paper_sessions_status ON paper_trading_sessions(status);
CREATE INDEX IF NOT EXISTS idx_risk_profiles_user_id ON risk_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_trading_user_id ON auto_trading_configs(user_id);
-- AUTO-CREATE DEFAULT FOR NEW USERS
CREATE OR REPLACE FUNCTION create_default_user_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default paper trading session
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
-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created_defaults ON auth.users;
CREATE TRIGGER on_auth_user_created_defaults
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_user_data();
-- ============================================================================
-- KLA-130: KLT Balances (hvis ikke eksisterer fra før)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.kltbalances (
    userid UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    balance BIGINT NOT NULL DEFAULT 500 CHECK (balance >= 0),
    total_earned BIGINT NOT NULL DEFAULT 500,
    total_spent BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.kltbalances IS 'User KLT balances with 500 welcome bonus';
ALTER TABLE public.kltbalances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own klt balance" ON public.kltbalances;
DROP POLICY IF EXISTS "Service can manage klt balances" ON public.kltbalances;
CREATE POLICY "Users can view own klt balance"
    ON public.kltbalances FOR SELECT
    USING (auth.uid() = userid);
CREATE POLICY "Service can manage klt balances"
    ON public.kltbalances FOR ALL
    USING (true)
    WITH CHECK (true);
GRANT SELECT ON public.kltbalances TO authenticated;
GRANT ALL ON public.kltbalances TO service_role;
CREATE INDEX IF NOT EXISTS idx_kltbalances_userid ON public.kltbalances(userid);
-- Trigger function for KLT bonus
CREATE OR REPLACE FUNCTION public.handle_new_user_klt()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.kltbalances (userid, balance, total_earned)
    VALUES (NEW.id, 500, 500)
    ON CONFLICT (userid) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS new_user_klt_bonus ON auth.users;
CREATE TRIGGER new_user_klt_bonus
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_klt();
-- Verifikasjon
SELECT 'KLA-154 + KLA-130: All tables created successfully' as status;
