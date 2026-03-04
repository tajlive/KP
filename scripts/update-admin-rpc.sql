-- Phase 6.1: Update Admin RPC to handle both `profiles` and `user_profiles`
-- since the auto-trading engine uses the `user_profiles` table and `subscription_tier` enum.

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
  
  -- Get current tier from the older profiles table (source of truth for old ops)
  SELECT subscription_tier INTO v_old_tier
  FROM profiles WHERE id = p_user_id;
  
  -- 1. Update legacy profiles table
  UPDATE profiles 
  SET 
    subscription_tier = p_new_tier,
    subscription_status = 'active',
    updated_at = NOW()
  WHERE id = p_user_id;

  -- 2. Update new auto-trading user_profiles table (has enum requirement)
  -- The tier must be cast to subscription_tier enum
  UPDATE user_profiles
  SET 
    tier = p_new_tier::subscription_tier,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Log the change
  INSERT INTO billing_events (user_id, event_type, from_tier, to_tier, metadata)
  VALUES (
    p_user_id, 
    'plan_upgraded_by_admin', 
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
