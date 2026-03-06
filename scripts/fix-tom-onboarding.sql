-- =====================================================
-- PHASE 1: Unblock Tom's Test Account (IMMEDIATE FIX)
-- =====================================================

-- Mark tom@klarpakke.no as onboarded
UPDATE user_profiles 
SET 
  onboarding_completed = true,
  setup_completed_at = NOW(),
  trading_experience = 'experienced',
  preferred_trading_mode = 'paper'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'tom@klarpakke.no'
);

-- Fallback for older profiles table
UPDATE profiles 
SET 
  onboarding_completed = true,
  setup_completed_at = NOW()
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'tom@klarpakke.no'
);

-- Verify
SELECT 
  u.email,
  up.onboarding_completed,
  up.setup_completed_at,
  up.trading_experience,
  up.preferred_trading_mode
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
WHERE u.email = 'tom@klarpakke.no';
