-- NØDFIX: Reparer auth-databasen
-- Kjør dette i Supabase SQL Editor for prosjektet ajcwdvqgcnugfwupemto

-- 1. Sikre at nødvendige extensions er aktivert
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS uuid-ossp;

-- 2. Verifiser at auth-schema finnes (vises i Table Editor)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
        RAISE EXCEPTION 'Auth-schema mangler! Kontakt Supabase support.';
    END IF;
END $$;

-- 3. Fiks public.profiles tabell (for vår app)
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    subscription_tier TEXT DEFAULT 'free',
    subscription_status TEXT DEFAULT 'inactive',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Deaktiver RLS midlertidig (for testing)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 5. Gi tilgang til alle
GRANT ALL ON public.profiles TO anon;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 6. Fjern trigger hvis den finnes (kan forårsake problemer)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 7. Verifisering
SELECT 
    'Auth schema eksisterer: ' || EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') as auth_check,
    'Extensions OK: ' || EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') as ext_check,
    'Profiles tabell OK: ' || EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') as profiles_check;
