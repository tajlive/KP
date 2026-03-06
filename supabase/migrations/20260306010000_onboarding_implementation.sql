-- =====================================================
-- KLA-91: Onboarding Implementation
-- Migration: Add onboarding fields to user_profiles
-- =====================================================

-- Add onboarding fields
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS trading_experience TEXT 
  CHECK (trading_experience IN ('beginner', 'intermediate', 'experienced', 'expert')),
ADD COLUMN IF NOT EXISTS preferred_trading_mode TEXT 
  CHECK (preferred_trading_mode IN ('paper', 'live')),
ADD COLUMN IF NOT EXISTS risk_tolerance TEXT 
  CHECK (risk_tolerance IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS binance_connected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Index for faster onboarding checks
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding 
ON user_profiles(id, onboarding_completed, onboarding_step);

-- Add comments for documentation
COMMENT ON COLUMN user_profiles.trading_experience IS 'User trading experience level';
COMMENT ON COLUMN user_profiles.preferred_trading_mode IS 'Preferred trading mode: paper or live';
COMMENT ON COLUMN user_profiles.risk_tolerance IS 'User risk tolerance level';
COMMENT ON COLUMN user_profiles.onboarding_step IS 'Current onboarding step (0-5)';
COMMENT ON COLUMN user_profiles.binance_connected IS 'Whether user has connected Binance API';
COMMENT ON COLUMN user_profiles.onboarding_started_at IS 'When user started onboarding';
COMMENT ON COLUMN user_profiles.onboarding_completed_at IS 'When user completed onboarding';

-- Update existing users to completed (migration safety)
UPDATE user_profiles 
SET 
  onboarding_completed = true,
  setup_completed_at = COALESCE(setup_completed_at, NOW()),
  onboarding_completed_at = COALESCE(setup_completed_at, NOW()),
  onboarding_step = 5
WHERE setup_completed_at IS NOT NULL 
  AND onboarding_completed IS NULL;

-- Create view for easier onboarding status checks
CREATE OR REPLACE VIEW user_onboarding_status AS
SELECT 
  id,
  email,
  onboarding_completed,
  onboarding_step,
  trading_experience,
  preferred_trading_mode,
  CASE 
    WHEN onboarding_completed THEN 'completed'
    WHEN onboarding_step > 0 THEN 'in_progress'
    ELSE 'not_started'
  END as status
FROM user_profiles;

-- Verify
SELECT 
  'Migration complete' as status,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE onboarding_completed) as completed,
  COUNT(*) FILTER (WHERE NOT onboarding_completed OR onboarding_completed IS NULL) as incomplete
FROM user_profiles;
