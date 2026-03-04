-- ============================================================
-- FIX: Auth trigger conflicts and consolidate handle_new_user()
-- ============================================================
-- Problem: Multiple conflicting versions of handle_new_user() 
-- and duplicate triggers causing signup/login issues
-- ============================================================

-- 1. First, ensure all required columns exist in profiles
DO $$
BEGIN
  -- Add missing columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
    ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'locale') THEN
    ALTER TABLE profiles ADD COLUMN locale TEXT DEFAULT 'no';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'subscription_tier') THEN
    ALTER TABLE profiles ADD COLUMN subscription_tier TEXT DEFAULT 'free';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'subscription_status') THEN
    ALTER TABLE profiles ADD COLUMN subscription_status TEXT DEFAULT 'inactive';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'google_id') THEN
    ALTER TABLE profiles ADD COLUMN google_id TEXT UNIQUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'microsoft_id') THEN
    ALTER TABLE profiles ADD COLUMN microsoft_id TEXT UNIQUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'provider') THEN
    ALTER TABLE profiles ADD COLUMN provider TEXT DEFAULT 'email';
  END IF;
END $$;

-- 2. Drop all existing triggers on auth.users to start fresh
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_google ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_auto_trade ON auth.users;

-- 3. Create ONE consolidated handle_new_user function
-- This handles ALL auth scenarios: email, Google, Microsoft, etc.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  provider_name TEXT;
  google_id_val TEXT;
  microsoft_id_val TEXT;
BEGIN
  -- Detect provider from metadata
  provider_name := COALESCE(
    NEW.raw_user_meta_data->>'provider',
    CASE 
      WHEN NEW.raw_user_meta_data->>'sub' IS NOT NULL THEN 'google'
      WHEN NEW.raw_user_meta_data->>'oid' IS NOT NULL THEN 'microsoft'
      ELSE 'email'
    END
  );
  
  -- Extract provider-specific IDs
  google_id_val := NEW.raw_user_meta_data->>'sub';  -- Google OAuth ID
  microsoft_id_val := NEW.raw_user_meta_data->>'oid';  -- Microsoft OID
  
  -- Insert or update profile
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    locale,
    provider,
    google_id,
    microsoft_id,
    role,
    subscription_tier,
    subscription_status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'locale', 'no'),
    provider_name,
    google_id_val,
    microsoft_id_val,
    'user',
    'free',
    'inactive',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      profiles.full_name
    ),
    avatar_url = COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      profiles.avatar_url
    ),
    provider = EXCLUDED.provider,
    google_id = COALESCE(google_id_val, profiles.google_id),
    microsoft_id = COALESCE(microsoft_id_val, profiles.microsoft_id),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create SINGLE trigger for all auth scenarios
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Ensure admin user has correct permissions (idempotent)
DO $$
DECLARE
  admin_user RECORD;
BEGIN
  SELECT * INTO admin_user 
  FROM auth.users 
  WHERE email = 'tomarnejensen@gmail.com';
  
  IF FOUND THEN
    INSERT INTO profiles (id, email, full_name, role, subscription_tier, subscription_status, created_at, updated_at)
    VALUES (
      admin_user.id,
      admin_user.email,
      COALESCE(admin_user.raw_user_meta_data->>'full_name', admin_user.email),
      'admin',
      'professor',
      'active',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE 
    SET role = 'admin', 
        subscription_tier = 'professor',
        subscription_status = 'active',
        updated_at = NOW();
    
    RAISE NOTICE 'Admin user tomarnejensen@gmail.com setup complete';
  END IF;
END $$;

-- 6. Create indexes for performance (if not exist)
CREATE INDEX IF NOT EXISTS idx_profiles_google_id ON profiles(google_id);
CREATE INDEX IF NOT EXISTS idx_profiles_microsoft_id ON profiles(microsoft_id);
CREATE INDEX IF NOT EXISTS idx_profiles_provider ON profiles(provider);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 7. Verify trigger is properly attached
DO $$
DECLARE
  trigger_count INT;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname = 'on_auth_user_created' 
    AND tgrelid = 'auth.users'::regclass;
  
  IF trigger_count = 1 THEN
    RAISE NOTICE '✅ Trigger on_auth_user_created is properly attached';
  ELSE
    RAISE WARNING '⚠️ Expected 1 trigger, found %', trigger_count;
  END IF;
END $$;

-- ============================================================
-- DONE! Auth system should now work correctly for all providers
-- ============================================================
