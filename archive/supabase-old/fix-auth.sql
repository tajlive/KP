-- Fiks Supabase Auth database-feil
-- Kjør dette i Supabase SQL Editor

-- 1. Sikre at nødvendige extensions er aktivert
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS uuid-ossp;

-- 2. Sjekk om auth-schema eksisterer (Supabase admin-only, men vi prøver)
DO $$
BEGIN
    -- Ingen direkte tilgang til auth-schema via SQL, men vi kan sjekke om det finnes
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
        RAISE NOTICE 'Auth-schema finnes ikke - må settes opp via Supabase Dashboard';
    END IF;
END $$;

-- 3. Fiks profiles-tabellen (hvis den ikke eksisterer)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    subscription_tier TEXT DEFAULT 'free',
    subscription_status TEXT DEFAULT 'inactive',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Aktiver RLS på profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Fiks RLS policies (fjern gamle først)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- 6. Opprett nye policies
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 7. Funksjon for å automatisk opprette profil ved ny bruker
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger for å automatisk opprette profil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 9. Gi anonym bruker tilgang (for auth callbacks)
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- 10. Fiks sequences hvis de mangler
DO $$
DECLARE
    seq_record RECORD;
BEGIN
    FOR seq_record IN 
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
    LOOP
        EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %I TO authenticated;', seq_record.sequence_name);
    END LOOP;
END $$;

-- Verifisering
SELECT 'Extensions aktivert:' as status;
SELECT extname FROM pg_extension WHERE extname IN ('pgcrypto', 'uuid-ossp');

SELECT 'Tables sjekket:' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles';

SELECT 'Auth trigger sjekket:' as status;
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE trigger_schema = 'auth' AND trigger_name = 'on_auth_user_created';
