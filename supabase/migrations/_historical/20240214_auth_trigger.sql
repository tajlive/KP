-- =====================================================
-- TRIGGER: Opprett profil automatisk ved signup
-- =====================================================

-- Funksjon som oppretter profil
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name,
        role,
        subscription_tier,
        subscription_status,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'user',
        'free',
        'inactive',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger som kjører etter signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- Gjør tomarnejensen@gmail.com til admin (etter at profilen er opprettet)
-- =====================================================

-- Dette kan kjøres manuelt etter at brukeren har logget inn første gang:
-- UPDATE profiles SET role = 'admin' WHERE email = 'tomarnejensen@gmail.com';

-- Eller vi kan sjekke om brukeren finnes i auth og opprette profilen manuelt:
DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- Finn brukeren i auth.users
    SELECT * INTO user_record 
    FROM auth.users 
    WHERE email = 'tomarnejensen@gmail.com';
    
    IF FOUND THEN
        -- Brukeren finnes i auth, sjekk om profil finnes
        INSERT INTO profiles (id, email, full_name, role, subscription_tier, subscription_status, created_at, updated_at)
        VALUES (
            user_record.id,
            user_record.email,
            COALESCE(user_record.raw_user_meta_data->>'full_name', user_record.email),
            'admin',  -- Sett som admin med en gang!
            'professor',  -- Høyeste nivå
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
    ELSE
        RAISE NOTICE 'User tomarnejensen@gmail.com not found in auth.users yet';
    END IF;
END $$;

-- =====================================================
-- FERDIG!
-- =====================================================
