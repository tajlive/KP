-- ============================================================
-- KLA-67: Fiks handle_new_user() trigger-konflikt
-- Problemet: 20260215000008_fix_auth_triggers.sql skreiv til
-- public.profiles, men canonical tabell er public.user_profiles
-- Konsekvens: nye brukere mangler user_profiles-rad
-- ============================================================

-- 1. Dropp ALLE eksisterende trigger-varianter
DROP TRIGGER IF EXISTS on_auth_user_created        ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_google ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_v2     ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger     ON auth.users;

-- 2. Ny konsolidert handle_new_user() — skriver til user_profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider      TEXT;
  v_google_id     TEXT;
  v_full_name     TEXT;
  v_avatar_url    TEXT;
  v_locale        TEXT;
BEGIN
  -- Detect provider
  v_provider := COALESCE(
    NEW.raw_user_meta_data->>'provider',
    CASE
      WHEN NEW.raw_user_meta_data->>'sub' IS NOT NULL THEN 'google'
      WHEN NEW.raw_user_meta_data->>'oid' IS NOT NULL THEN 'microsoft'
      ELSE 'email'
    END
  );

  v_google_id  := NEW.raw_user_meta_data->>'sub';
  v_full_name  := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
  v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';
  v_locale     := COALESCE(NEW.raw_user_meta_data->>'locale', 'no');

  -- Skriv til user_profiles (canonical tabell)
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    avatar_url,
    locale,
    provider,
    role,
    subscription_tier,
    subscription_status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_avatar_url,
    v_locale,
    v_provider,
    'user',
    'free',
    'inactive',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name          = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    avatar_url         = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
    provider           = EXCLUDED.provider,
    updated_at         = NOW();

  -- Også oppdater profiles-tabellen hvis den eksisterer (bakoverkompatibilitet)
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    locale,
    provider,
    role,
    subscription_tier,
    subscription_status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_avatar_url,
    v_locale,
    v_provider,
    'user',
    'free',
    'inactive',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name  = COALESCE(EXCLUDED.full_name, profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- 3. Én trigger, én funksjon
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Backfill: lag user_profiles for eksisterende auth.users som mangler det
INSERT INTO public.user_profiles (id, email, full_name, role, subscription_tier, subscription_status, created_at, updated_at)
SELECT
  u.id,
  u.email,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1)
  ),
  'user',
  'free',
  'inactive',
  u.created_at,
  NOW()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles up WHERE up.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- 5. Sett admin-bruker korrekt i user_profiles
INSERT INTO public.user_profiles (id, email, full_name, role, subscription_tier, subscription_status, created_at, updated_at)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  'admin',
  'professor',
  'active',
  u.created_at,
  NOW()
FROM auth.users u
WHERE u.email = 'tomarnejensen@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role                = 'admin',
  subscription_tier   = 'professor',
  subscription_status = 'active',
  updated_at          = NOW();

-- 6. Verifiser
DO $$
DECLARE
  v_trigger_count INT;
  v_orphan_count  INT;
BEGIN
  SELECT COUNT(*) INTO v_trigger_count
  FROM pg_trigger
  WHERE tgname = 'on_auth_user_created'
    AND tgrelid = 'auth.users'::regclass;

  SELECT COUNT(*) INTO v_orphan_count
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles up WHERE up.id = u.id
  );

  IF v_trigger_count = 1 THEN
    RAISE NOTICE '✅ Trigger on_auth_user_created OK (1 instans)';
  ELSE
    RAISE WARNING '⚠️ Feil antall triggere: %', v_trigger_count;
  END IF;

  IF v_orphan_count = 0 THEN
    RAISE NOTICE '✅ Alle auth.users har user_profiles-rad';
  ELSE
    RAISE WARNING '⚠️ % brukere mangler fortsatt user_profiles-rad', v_orphan_count;
  END IF;
END $$;

-- ============================================================
-- KLA-67 LØST: handle_new_user() skriver nå til user_profiles
-- Alle eksisterende brukere er backfillt
-- Admin har professor-tier
-- ============================================================
