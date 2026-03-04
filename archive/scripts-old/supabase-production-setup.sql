-- ============================================================
-- PRODUKSJONS-KONFIGURASJON FOR KLARPAKKE
-- ============================================================
-- Kjør dette i Supabase SQL Editor etter deploy til produksjon

-- 1. OPPDATER URL-ER FOR PRODUKSJON
-- ============================================================

-- Sett korrekt site URL (NB: Dette gjøres vanligvis i Supabase Dashboard UI,
-- men her er SQL for å verifisere config)

-- 2. SJEKK GOOGLE PROVIDER KONFIGURASJON
-- ============================================================

-- Verifiser at auth-innstillinger er korrekte
SELECT 
    'Auth Config' as check_type,
    site_url,
    array_length(additional_redirect_urls, 1) as redirect_url_count
FROM auth.config;

-- 3. SJEKK AT PROFILES TABELLEN HAR ROLLE-KOLONNE
-- ============================================================

-- Legg til role kolonne hvis den mangler
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN role TEXT DEFAULT 'user' 
        CHECK (role IN ('admin', 'user', 'beta', 'premium', 'master', 'phd', 'professor'));
        
        CREATE INDEX idx_profiles_role ON profiles(role);
        
        RAISE NOTICE 'Role column added to profiles table';
    ELSE
        RAISE NOTICE 'Role column already exists';
    END IF;
END $$;

-- 4. SETT ADMIN BRUKER
-- ============================================================

-- Oppdater din e-post som admin (BYTT UT!)
UPDATE profiles 
SET role = 'admin',
    updated_at = NOW()
WHERE email = 'tomarnejensen@gmail.com'  -- ENDRE DENNE!
   OR email LIKE '%@klarpakke.no';

-- 5. VERIFISER ADMIN-TILGANG
-- ============================================================

SELECT 
    'Admin Users' as check_type,
    count(*) as admin_count
FROM profiles 
WHERE role = 'admin';

-- Vis admin-brukere
SELECT id, email, role, created_at 
FROM profiles 
WHERE role = 'admin';

-- 6. SJEKK GOOGLE IDENTITETER
-- ============================================================

-- Se hvilke brukere som har Google-login
SELECT 
    au.email,
    i.provider,
    i.last_sign_in_at,
    p.role
FROM auth.identities i
JOIN auth.users au ON i.user_id = au.id
LEFT JOIN profiles p ON au.id = p.id
WHERE i.provider = 'google'
ORDER BY i.last_sign_in_at DESC;

-- 7. SJEKK AKTIVE PROVIDERS
-- ============================================================

SELECT 
    provider,
    enabled
FROM auth.providers
ORDER BY provider;

-- 8. RYDD OPP I SESSIONS (valgfritt - fjern gamle sessions)
-- ============================================================

-- Fjern sessions eldre enn 30 dager (valgfritt)
-- DELETE FROM auth.sessions 
-- WHERE created_at < NOW() - INTERVAL '30 days';

-- 9. VERIFISER RLS POLICIES FOR PROFILES
-- ============================================================

-- Sjekk at RLS er enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'profiles' AND schemaname = 'public';

-- Vis policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 10. SJEKK AT TRIGGER FOR NYE BRUKERE FUNGERER
-- ============================================================

-- Verifiser at handle_new_user funksjonen eksisterer
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'handle_new_user';

-- ============================================================
-- SJEKKLISTE FOR MANUELL KONFIGURASJON (Supabase Dashboard):
-- ============================================================
--
-- 1. Gå til: https://app.supabase.com/project/_/auth/settings
-- 2. Under "Site URL": Sett til https://www.klarpakke.no
-- 3. Under "Additional Redirect URLs":
--    - https://www.klarpakke.no/**
--    - https://www.klarpakke.no/auth/callback
-- 4. Under "Providers" → "Google":
--    - Enabled: ON
--    - Client ID: [fra Google Cloud Console]
--    - Client Secret: [fra Google Cloud Console]
-- 5. I Google Cloud Console (https://console.cloud.google.com/):
--    - APIs & Services → Credentials → OAuth 2.0 Client IDs
--    - Authorized JavaScript origins: https://www.klarpakke.no
--    - Authorized redirect URIs: https://vuxbjlykgmzskxbclquf.supabase.co/auth/v1/callback
--
-- ============================================================

SELECT 'Produksjons-oppsett ferdig!' as status;
