-- =====================================================
-- FIX: OPPRETT profiles VIEW FOR API AUTH
-- =====================================================

-- 1. Sjekk om user_profiles tabellen finnes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_profiles' AND table_schema = 'public'
  ) THEN
    RAISE EXCEPTION 'user_profiles tabellen finnes ikke! Kjør deploy_fresh.sql først.';
  END IF;
END $$;

-- 2. Drop eksisterende profiles view hvis det finnes
DROP VIEW IF EXISTS profiles CASCADE;

-- 3. Opprett profiles view med riktig struktur
-- Dette viewet brukes av API-et for å sjekke user role/permissions
CREATE OR REPLACE VIEW profiles AS
SELECT 
  up.id,
  up.user_id,
  up.tier AS role,  -- Mapper tier til role for bakoverkompatibilitet
  up.paper_balance,
  up.real_balance,
  up.created_at,
  up.updated_at,
  COALESCE(
    au.raw_user_meta_data->>'name',
    split_part(au.email, '@', 1)
  ) AS display_name,
  au.raw_user_meta_data->>'avatar_url' AS avatar_url,
  au.email,
  CASE 
    WHEN up.tier IN ('phd', 'professor') THEN 'live'
    ELSE 'paper'
  END AS trading_mode
FROM user_profiles up
LEFT JOIN auth.users au ON au.id = up.user_id;

-- 4. Grant permissions
GRANT SELECT ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;
GRANT SELECT ON profiles TO service_role;

-- 5. Legg til kommentar
COMMENT ON VIEW profiles IS 'User profiles view for API auth - exposes user role and metadata';

-- 6. Verifiser at view ble opprettet
SELECT 'profiles view created successfully' as status;

-- 7. Test query
SELECT COUNT(*) as total_profiles FROM profiles;
