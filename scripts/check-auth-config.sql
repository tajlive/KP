-- ============================================================
-- DIAGNOSE AUTH CONFIGURATION
-- ============================================================
-- Kjør dette i Supabase SQL Editor for å sjekke auth-oppsett

-- 1. Sjekk at brukeren eksisterer i auth.users
SELECT 
    id,
    email,
    email_confirmed_at,
    last_sign_in_at,
    created_at,
    raw_user_meta_data->>'full_name' as full_name,
    raw_user_meta_data->>'avatar_url' as avatar_url,
    raw_app_meta_data->>'provider' as provider
FROM auth.users 
WHERE email = 'din-email@example.com';  -- BYTT UT!

-- 2. Sjekk at brukeren har profil i public.profiles
SELECT 
    p.id,
    p.email,
    p.role,
    p.full_name,
    p.created_at,
    p.updated_at
FROM profiles p
WHERE p.email = 'din-email@example.com';  -- BYTT UT!

-- 3. Sjekk auth-konfigurasjon
SELECT 
    site_url,
    additional_redirect_urls,
    mfa_enabled,
    confirm_email
FROM auth.config;

-- 4. Sjekk om det er noen identiteter (for OAuth)
SELECT 
    user_id,
    provider,
    identity_data->>'email' as email,
    last_sign_in_at,
    created_at
FROM auth.identities
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'din-email@example.com'
);

-- 5. Sjekk om det er noen aktive sesjoner
SELECT 
    user_id,
    created_at,
    updated_at,
    ip,
    user_agent
FROM auth.sessions
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'din-email@example.com'
)
ORDER BY created_at DESC
LIMIT 5;

-- 6. Sjekk auth providers
SELECT 
    provider,
    enabled
FROM auth.providers
WHERE enabled = true;
