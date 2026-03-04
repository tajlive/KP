-- ============================================================
-- FIX: /no7admin issues - Missing columns and RLS policies
-- Dato: 2026-02-24
-- Issues:
--   1. Missing translations (fixed in messages files)
--   2. Supabase 500 errors - Missing columns in profiles table
--   3. RLS policies for admin access
-- ============================================================

-- 1. Sjekk og legg til manglende kolonner i profiles-tabellen
-- ============================================================

-- Kolonner som må finnes for /no7admin:
-- - role (TEXT)
-- - trading_mode (TEXT) 
-- - binance_api_key_encrypted (TEXT)
-- - binance_connected_at (TIMESTAMPTZ)
-- - paper_trades_count (INTEGER)

DO $$
BEGIN
    -- Legg til role kolonne hvis den ikke finnes
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'role'
    ) THEN
        ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user';
        RAISE NOTICE 'La til role kolonne i profiles';
    END IF;

    -- Legg til trading_mode kolonne hvis den ikke finnes
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'trading_mode'
    ) THEN
        ALTER TABLE profiles ADD COLUMN trading_mode TEXT DEFAULT 'paper' CHECK (trading_mode IN ('paper', 'live'));
        RAISE NOTICE 'La til trading_mode kolonne i profiles';
    END IF;

    -- Legg til binance_api_key_encrypted kolonne hvis den ikke finnes
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'binance_api_key_encrypted'
    ) THEN
        ALTER TABLE profiles ADD COLUMN binance_api_key_encrypted TEXT;
        RAISE NOTICE 'La til binance_api_key_encrypted kolonne i profiles';
    END IF;

    -- Legg til binance_connected_at kolonne hvis den ikke finnes
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'binance_connected_at'
    ) THEN
        ALTER TABLE profiles ADD COLUMN binance_connected_at TIMESTAMPTZ;
        RAISE NOTICE 'La til binance_connected_at kolonne i profiles';
    END IF;

    -- Legg til paper_trades_count kolonne hvis den ikke finnes
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'paper_trades_count'
    ) THEN
        ALTER TABLE profiles ADD COLUMN paper_trades_count INTEGER DEFAULT 0;
        RAISE NOTICE 'La til paper_trades_count kolonne i profiles';
    END IF;
END $$;

-- 2. Sikre at RLS er aktivert
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Drop eksisterende policies for å unngå duplikater
-- ============================================================
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for users" ON profiles;
DROP POLICY IF EXISTS "Enable update for users" ON profiles;
DROP POLICY IF EXISTS "Enable all for admins" ON profiles;

-- 4. Opprett RLS policies
-- ============================================================

-- Policy: Brukere kan se sin egen profil
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Policy: Brukere kan oppdatere sin egen profil
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Admin kan se alle profiler (viktig for /no7admin)
CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Policy: Admin kan oppdatere alle profiler
CREATE POLICY "Admin can update all profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 5. Funksjon for å sjekke om bruker er admin
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_uuid AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Sett admin-rolle for spesifikk bruker (tomarnejensen@gmail.com)
-- ============================================================
UPDATE profiles
SET role = 'admin'
WHERE email = 'tomarnejensen@gmail.com';

-- 7. Verifiser at kolonnene finnes
-- ============================================================
SELECT 
  'Kolonner i profiles-tabellen:' as info,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('role', 'trading_mode', 'binance_api_key_encrypted', 'binance_connected_at', 'paper_trades_count')
ORDER BY ordinal_position;

-- 8. Verifiser RLS policies
-- ============================================================
SELECT 
  'RLS Policies for profiles:' as info,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'profiles';
