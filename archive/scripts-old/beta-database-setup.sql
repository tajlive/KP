-- ============================================
-- PHASE 1: KLARPAKKE BETA DATABASE SETUP
-- ============================================

-- 1. Add beta columns to profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS beta_access BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS beta_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS beta_features JSONB DEFAULT '{
    "live_trading": false, 
    "ai_copilot": true, 
    "auto_trade": false
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS beta_limits JSONB DEFAULT '{
    "max_trade_size_nok": 1000, 
    "max_daily_trades": 10, 
    "max_daily_loss_nok": 1000
  }'::jsonb;

-- 2. Create beta_applications table
CREATE TABLE IF NOT EXISTS beta_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  application_status TEXT DEFAULT 'pending' CHECK (
    application_status IN ('pending', 'approved', 'rejected')
  ),
  trading_experience TEXT NOT NULL,
  motivation TEXT NOT NULL,
  risk_tolerance TEXT NOT NULL CHECK (
    risk_tolerance IN ('conservative', 'moderate', 'aggressive')
  ),
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- 3. Create ai_risk_analyses table
CREATE TABLE IF NOT EXISTS ai_risk_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  trade_request JSONB NOT NULL,
  risk_level TEXT NOT NULL CHECK (
    risk_level IN ('low', 'medium', 'high', 'extreme')
  ),
  recommendation TEXT NOT NULL CHECK (
    recommendation IN ('approve', 'caution', 'block')
  ),
  reasoning TEXT NOT NULL,
  locale TEXT DEFAULT 'no',
  alternatives JSONB,
  educational_tips TEXT[],
  user_proceeded BOOLEAN DEFAULT false,
  actual_outcome JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Add encryption IV columns to trading_api_keys
ALTER TABLE trading_api_keys 
  ADD COLUMN IF NOT EXISTS api_key_iv TEXT,
  ADD COLUMN IF NOT EXISTS api_secret_iv TEXT;

-- 5. Enable Row Level Security
ALTER TABLE beta_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_risk_analyses ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for beta_applications
DROP POLICY IF EXISTS "Users see own applications" ON beta_applications;
CREATE POLICY "Users see own applications" ON beta_applications
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins see all applications" ON beta_applications;
CREATE POLICY "Admins see all applications" ON beta_applications
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- 7. RLS Policies for ai_risk_analyses
DROP POLICY IF EXISTS "Users see own analyses" ON ai_risk_analyses;
CREATE POLICY "Users see own analyses" ON ai_risk_analyses
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins see all analyses" ON ai_risk_analyses;
CREATE POLICY "Admins see all analyses" ON ai_risk_analyses
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_beta_applications_user_id 
  ON beta_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_beta_applications_status 
  ON beta_applications(application_status);
CREATE INDEX IF NOT EXISTS idx_ai_risk_analyses_user_id 
  ON ai_risk_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_risk_analyses_created_at 
  ON ai_risk_analyses(created_at DESC);

-- Done!
SELECT 'Database setup complete!' as status;
