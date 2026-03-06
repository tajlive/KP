-- =====================================================
-- OPPRETT TEST BRUKER FOR E2E TESTER
-- =====================================================

-- MERK: Dette skal kun kjøres i test/utviklingsmiljø
-- Ikke kjør i produksjon!

DO $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000001';
    test_email TEXT := 'test@klarpakke.com';
BEGIN
    -- Sjekk om vi er i produksjon (ikke kjør der)
    IF current_setting('app.settings.environment', true) = 'production' THEN
        RAISE NOTICE 'Skipping test user creation in production';
        RETURN;
    END IF;

    -- Slett eksisterende test-bruker hvis finnes
    DELETE FROM auth.users WHERE email = test_email;
    
    -- Opprett test-bruker med kjent passord hash
    -- Passord: TestPassword123!
    -- Hash generert med: bcrypt.hashpw(b'TestPassword123!', bcrypt.gensalt())
    INSERT INTO auth.users (
        id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data
    ) VALUES (
        test_user_id,
        test_email,
        '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890123456789012345', -- Placeholder, må genereres riktig
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Test User"}'
    )
    ON CONFLICT (email) DO UPDATE SET
        email_confirmed_at = NOW(),
        updated_at = NOW();
    
    RAISE NOTICE 'Test user created/updated: %', test_email;
    
    -- Opprett profil (triggere skal gjøre dette automatisk, men sikkerhets skyld)
    INSERT INTO profiles (id, email, full_name, created_at, updated_at)
    VALUES (test_user_id, test_email, 'Test User', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
        updated_at = NOW();
        
    RAISE NOTICE 'Test user profile created/updated';
    
END $$;

-- =====================================================
-- MANUELL OPPRETTELSE (alternativ)
-- =====================================================
-- 
-- Hvis migrasjonen over ikke fungerer, kan du opprette 
-- test-brukeren manuelt via Supabase Dashboard:
--
-- 1. Gå til https://app.supabase.com/project/_/auth/users
-- 2. Klikk "Add user"
-- 3. Email: test@klarpakke.com
-- 4. Passord: TestPassword123!
-- 5. Huk av "Auto-confirm email"
-- 6. Klikk "Create user"
--
