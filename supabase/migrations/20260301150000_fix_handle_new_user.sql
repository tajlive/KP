-- ============================================================================
-- KLA-67: Consolidate handle_new_user() trigger to INSERT INTO user_profiles
-- ============================================================================
-- Problem: Migration 20260215000008 replaced this function to INSERT INTO
-- profiles (a table/view that may not exist), breaking signup for new users.
-- Fix: Restore the canonical version that inserts into user_profiles.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1),
      'Trader'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Verify
DO $$
BEGIN
  RAISE NOTICE 'KLA-67: handle_new_user() now inserts into user_profiles';
END $$;
