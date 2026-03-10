-- ============================================================================
-- KLA-XXX: Fix trigger functions with wrong column names
-- Issue: initialize_user_settings() uses NEW.user_id but profiles table has 'id'
-- ============================================================================

-- Fix 1: initialize_user_settings() - wrong column name for profiles table
-- profiles table has 'id' UUID REFERENCES auth.users, not 'user_id'
CREATE OR REPLACE FUNCTION initialize_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_notification_settings (user_id)
  VALUES (NEW.id)  -- Fixed: was NEW.user_id, profiles uses 'id'
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id)  -- Fixed: was NEW.user_id, profiles uses 'id'
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verify trigger exists and is using correct function
DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION initialize_user_settings();

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Fixed initialize_user_settings(): NEW.user_id -> NEW.id';
  RAISE NOTICE '✅ Trigger on_profile_created recreated on profiles table';
END $$;
