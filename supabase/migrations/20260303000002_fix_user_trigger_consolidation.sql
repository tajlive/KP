-- ============================================================================
-- KLA-67: Fix handle_new_user() trigger conflict
-- Consolidation to canonical user_profiles table.
-- ============================================================================

-- 1. Ensure user_profiles has required metadata columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'locale') THEN
        ALTER TABLE user_profiles ADD COLUMN locale TEXT DEFAULT 'no';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'provider') THEN
        ALTER TABLE user_profiles ADD COLUMN provider TEXT DEFAULT 'email';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'google_id') THEN
        ALTER TABLE user_profiles ADD COLUMN google_id TEXT UNIQUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'microsoft_id') THEN
        ALTER TABLE user_profiles ADD COLUMN microsoft_id TEXT UNIQUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'role') THEN
        ALTER TABLE user_profiles ADD COLUMN role TEXT DEFAULT 'user';
    END IF;
END $$;

-- 2. Drop all conflicting triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_google ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_auto_trade ON auth.users;

-- 3. Consolidated handle_new_user() function
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
  
  -- Insert into canonical user_profiles
  INSERT INTO public.user_profiles (
    id,
    display_name,
    email_on_trade,
    email_on_crash,
    email_daily_digest,
    tier,
    role,
    avatar_url,
    locale,
    provider,
    google_id,
    microsoft_id,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1),
      'Trader'
    ),
    true,   -- default email_on_trade
    true,   -- default email_on_crash
    true,   -- default email_daily_digest
    'free', -- default tier
    'user', -- default role
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'locale', 'no'),
    provider_name,
    google_id_val,
    microsoft_id_val,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      user_profiles.display_name
    ),
    avatar_url = COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      user_profiles.avatar_url
    ),
    provider = EXCLUDED.provider,
    google_id = COALESCE(google_id_val, user_profiles.google_id),
    microsoft_id = COALESCE(microsoft_id_val, user_profiles.microsoft_id),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-attach single trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Sync existing data from legacy 'profiles' if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        INSERT INTO public.user_profiles (id, display_name, avatar_url, role, tier, locale, provider, google_id, microsoft_id, created_at, updated_at)
        SELECT 
            p.id, 
            COALESCE(p.full_name, 'Trader'), 
            p.avatar_url, 
            p.role, 
            COALESCE(p.subscription_tier::text, 'free')::subscription_tier,
            p.locale, 
            p.provider, 
            p.google_id, 
            p.microsoft_id, 
            p.created_at, 
            p.updated_at
        FROM public.profiles p
        ON CONFLICT (id) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            avatar_url = EXCLUDED.avatar_url,
            role = EXCLUDED.role,
            tier = EXCLUDED.tier,
            locale = EXCLUDED.locale,
            provider = EXCLUDED.provider,
            google_id = EXCLUDED.google_id,
            microsoft_id = EXCLUDED.microsoft_id,
            updated_at = NOW();
            
        -- Optional: Rename legacy table to avoid confusion
        -- ALTER TABLE public.profiles RENAME TO profiles_deprecated;
    END IF;
END $$;

-- 6. Setup indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_google_id ON user_profiles(google_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_microsoft_id ON user_profiles(microsoft_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_provider ON user_profiles(provider);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
