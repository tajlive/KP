-- ============================================================
-- FIX: Auth trigger conflicts and consolidate handle_new_user()
-- ============================================================
-- Works with either public.profiles OR public.user_profiles (this project uses user_profiles).
-- ============================================================

-- 2. Drop all existing triggers on auth.users to start fresh
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_google ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_auto_trade ON auth.users;

-- 3. Create ONE consolidated handle_new_user function
-- If user_profiles exists (this project): insert there. Else if profiles exists: insert there.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  display_name_val TEXT;
  avatar_url_val TEXT;
BEGIN
  display_name_val := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'Trader'
  );
  avatar_url_val := NEW.raw_user_meta_data->>'avatar_url';

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    INSERT INTO public.user_profiles (id, display_name, avatar_url, updated_at)
    VALUES (NEW.id, display_name_val, avatar_url_val, NOW())
    ON CONFLICT (id) DO UPDATE SET
      display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
      updated_at = NOW();
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    INSERT INTO public.profiles (
      id, email, full_name, avatar_url, locale, provider,
      google_id, microsoft_id, role, subscription_tier, subscription_status,
      created_at, updated_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      display_name_val,
      avatar_url_val,
      COALESCE(NEW.raw_user_meta_data->>'locale', 'no'),
      COALESCE(NEW.raw_user_meta_data->>'provider', 'email'),
      NEW.raw_user_meta_data->>'sub',
      NEW.raw_user_meta_data->>'oid',
      'user',
      'free',
      'inactive',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create SINGLE trigger for all auth scenarios
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Verify trigger is properly attached
DO $$
DECLARE
  trigger_count INT;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname = 'on_auth_user_created'
    AND tgrelid = 'auth.users'::regclass;

  IF trigger_count = 1 THEN
    RAISE NOTICE 'Trigger on_auth_user_created is properly attached';
  ELSE
    RAISE WARNING 'Expected 1 trigger, found %', trigger_count;
  END IF;
END $$;
