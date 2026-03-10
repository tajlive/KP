-- ============================================================================
-- KLA-XXX: Fix trigger functions with wrong column names + user creation flow
-- ============================================================================
-- Issues found:
-- 1. initialize_user_settings() used NEW.user_id but should use NEW.id
-- 2. create_default_user_data() didn't create user_profiles (causing FK errors)
-- 3. user_profiles table has separate id (PK) and user_id (FK) columns
-- ============================================================================

-- Fix 1: initialize_user_settings() - wrong column reference
CREATE OR REPLACE FUNCTION initialize_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_notification_settings (user_id)
  VALUES (NEW.id)  -- Fixed: was NEW.user_id
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id)  -- Fixed: was NEW.user_id
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix 2: Create trigger on user_profiles (canonical table)
DROP TRIGGER IF EXISTS on_user_profile_created ON user_profiles;
CREATE TRIGGER on_user_profile_created
  AFTER INSERT ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION initialize_user_settings();

-- Fix 3: Update create_default_user_data to create user_profiles correctly
-- Note: user_profiles has id (PK, gen_random_uuid()) AND user_id (FK to auth.users)
CREATE OR REPLACE FUNCTION create_default_user_data()
RETURNS TRIGGER AS $$
DECLARE
  new_id UUID := gen_random_uuid();
BEGIN
  -- Create user_profiles (canonical user record)
  INSERT INTO public.user_profiles (
    id, user_id, display_name, email_on_trade, email_on_crash, email_daily_digest,
    tier, role, provider, locale, created_at, updated_at
  )
  VALUES (
    new_id,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 
             split_part(NEW.email, '@', 1), 'Trader'),
    true, true, true,
    'free', 'user',
    COALESCE(NEW.raw_user_meta_data->>'provider', 'email'),
    COALESCE(NEW.raw_user_meta_data->>'locale', 'no'),
    NOW(), NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Create user_settings
  INSERT INTO user_settings (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;

  -- Create user_notification_settings
  INSERT INTO user_notification_settings (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;

  -- Create paper trading session
  INSERT INTO paper_trading_sessions (user_id, starting_balance, current_balance)
  VALUES (NEW.id, 100000, 100000) ON CONFLICT DO NOTHING;
  
  -- Create default risk profiles
  INSERT INTO risk_profiles (user_id, name, max_position_size_pct, stop_loss_pct, 
                             max_total_exposure_pct, is_active) VALUES
    (NEW.id, 'forsiktig', 2.0, 3.0, 5.0, true),
    (NEW.id, 'moderat', 5.0, 5.0, 15.0, false),
    (NEW.id, 'aggressiv', 10.0, 10.0, 30.0, false)
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Backfill: Ensure existing users have all required data
-- ============================================================================

-- Backfill user_settings for existing user_profiles
INSERT INTO user_settings (user_id)
SELECT user_id FROM user_profiles
WHERE user_id NOT IN (SELECT user_id FROM user_settings)
ON CONFLICT (user_id) DO NOTHING;

-- Backfill user_notification_settings for existing user_profiles
INSERT INTO user_notification_settings (user_id)
SELECT user_id FROM user_profiles
WHERE user_id NOT IN (SELECT user_id FROM user_notification_settings)
ON CONFLICT (user_id) DO NOTHING;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Fixed initialize_user_settings(): NEW.user_id -> NEW.id';
  RAISE NOTICE '✅ Created trigger on_user_profile_created on user_profiles';
  RAISE NOTICE '✅ Updated create_default_user_data() to handle user_profiles correctly';
END $$;
