-- User Management Setup: username, user_number, source tracking
-- ============================================================

-- 1. Add username column for competition/leaderboard
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
-- 2. Add user_number column (starting from 4101)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS user_number INTEGER UNIQUE;
-- 3. Add source tracking (where user came from)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'organic' 
CHECK (source IN ('organic', 'google_ads', 'referral', 'social', 'partner', 'beta_invite'));
-- 4. Create sequence for user numbers starting at 4101
DROP SEQUENCE IF EXISTS user_number_seq;
CREATE SEQUENCE user_number_seq START 4101;
-- 5. Function to auto-assign user number on insert
CREATE OR REPLACE FUNCTION assign_user_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_number IS NULL THEN
    NEW.user_number := nextval('user_number_seq');
  END IF;
  
  -- Auto-generate username from email if not provided
  IF NEW.username IS NULL AND NEW.email IS NOT NULL THEN
    NEW.username := SPLIT_PART(NEW.email, '@', 1);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- 6. Create trigger for auto-assigning user_number
DROP TRIGGER IF EXISTS trigger_assign_user_number ON profiles;
CREATE TRIGGER trigger_assign_user_number
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_user_number();
-- 7. Backfill existing users
UPDATE profiles 
SET user_number = nextval('user_number_seq')
WHERE user_number IS NULL;
UPDATE profiles 
SET username = SPLIT_PART(email, '@', 1)
WHERE username IS NULL AND email IS NOT NULL;
-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_user_number ON profiles(user_number);
CREATE INDEX IF NOT EXISTS idx_profiles_source ON profiles(source);
-- 9. Admin function to upgrade user subscription tier
CREATE OR REPLACE FUNCTION admin_upgrade_user(
  p_user_id UUID,
  p_new_tier TEXT,
  p_admin_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_old_tier TEXT;
  v_result JSONB;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_admin_id AND role = 'admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin only');
  END IF;
  
  -- Get current tier
  SELECT subscription_tier INTO v_old_tier
  FROM profiles WHERE id = p_user_id;
  
  -- Update tier
  UPDATE profiles 
  SET 
    subscription_tier = p_new_tier,
    subscription_status = 'active',
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Log the change
  INSERT INTO billing_events (user_id, event_type, from_tier, to_tier, metadata)
  VALUES (
    p_user_id, 
    'plan_upgraded', 
    v_old_tier, 
    p_new_tier,
    jsonb_build_object('upgraded_by', p_admin_id, 'upgraded_at', NOW())
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'old_tier', v_old_tier,
    'new_tier', p_new_tier
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 10. Admin function to change user role
CREATE OR REPLACE FUNCTION admin_change_role(
  p_user_id UUID,
  p_new_role TEXT,
  p_admin_id UUID
)
RETURNS JSONB AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_admin_id AND role = 'admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin only');
  END IF;
  
  -- Validate role
  IF p_new_role NOT IN ('admin', 'user', 'beta', 'premium', 'master', 'phd', 'professor') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
  END IF;
  
  UPDATE profiles 
  SET role = p_new_role,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'new_role', p_new_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 11. View for admin user list
CREATE OR REPLACE VIEW admin_user_list AS
SELECT 
  p.id,
  p.user_number,
  p.username,
  p.email,
  p.full_name,
  p.role,
  p.subscription_tier,
  p.subscription_status,
  p.source,
  p.beta_approved,
  p.created_at,
  p.last_sign_in_at,
  COALESCE(ps.total_value_nok, 0) as portfolio_value,
  COALESCE(COUNT(DISTINCT at.id), 0) as total_trades
FROM profiles p
LEFT JOIN portfolio_summary ps ON ps.user_id = p.id
LEFT JOIN auto_trades at ON at.user_id = p.id
GROUP BY p.id, p.user_number, p.username, p.email, p.full_name, 
         p.role, p.subscription_tier, p.subscription_status, 
         p.source, p.beta_approved, p.created_at, p.last_sign_in_at,
         ps.total_value_nok;
-- Grant access
GRANT SELECT ON admin_user_list TO authenticated;
-- 12. Update your profile (tomarnejensen@gmail.com) as first user
UPDATE profiles 
SET 
  user_number = 4100,
  username = 'taj_admin',
  role = 'admin',
  subscription_tier = 'vip_ekstrem',
  subscription_status = 'active',
  source = 'organic'
WHERE email = 'tomarnejensen@gmail.com';
-- 13. Set sequence to start after 4100
SELECT setval('user_number_seq', 4101, false);
-- Verify setup
SELECT 'User management setup complete' as status;
SELECT user_number, username, email, role FROM profiles WHERE email = 'tomarnejensen@gmail.com';
