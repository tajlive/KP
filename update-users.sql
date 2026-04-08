-- 💰 Oppdater testbrukere med 10M og Professor tier
-- Kjøres: 8. april 2026

-- Sjekk eksisterende brukere
SELECT id, email, created_at 
FROM auth.users 
WHERE email IN (
    'tom@klarpakke.no',
    'klarpakke.test+playwright@gmail.com',
    'tomarnejensen@gmail.com'
);

-- Oppdater eller opprett profiler for testbrukere
-- Bruker 1: tom@klarpakke.no
INSERT INTO public.user_profiles (id, email, subscription_tier, wallet_balance, paper_balance, updated_at)
SELECT 
    id,
    email,
    'professor'::subscription_tier,
    10000000,
    10000000,
    NOW()
FROM auth.users 
WHERE email = 'tom@klarpakke.no'
ON CONFLICT (id) DO UPDATE SET
    subscription_tier = 'professor',
    wallet_balance = 10000000,
    paper_balance = 10000000,
    updated_at = NOW();

-- Bruker 2: klarpakke.test+playwright@gmail.com
INSERT INTO public.user_profiles (id, email, subscription_tier, wallet_balance, paper_balance, updated_at)
SELECT 
    id,
    email,
    'professor'::subscription_tier,
    10000000,
    10000000,
    NOW()
FROM auth.users 
WHERE email = 'klarpakke.test+playwright@gmail.com'
ON CONFLICT (id) DO UPDATE SET
    subscription_tier = 'professor',
    wallet_balance = 10000000,
    paper_balance = 10000000,
    updated_at = NOW();

-- Bruker 3: tomarnejensen@gmail.com (opprettes hvis ikke finnes)
-- Først: Sjekk om bruker finnes i auth
DO $$
DECLARE
    user_id UUID;
BEGIN
    SELECT id INTO user_id FROM auth.users WHERE email = 'tomarnejensen@gmail.com';
    
    IF user_id IS NULL THEN
        -- Opprett bruker i auth (midlertidig passord)
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'tomarnejensen@gmail.com',
            crypt('TestPassword123!', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW()
        )
        ON CONFLICT (email) DO NOTHING
        RETURNING id INTO user_id;
    END IF;
    
    -- Opprett/oppdater profil
    IF user_id IS NOT NULL THEN
        INSERT INTO public.user_profiles (id, email, subscription_tier, wallet_balance, paper_balance, updated_at)
        VALUES (
            user_id,
            'tomarnejensen@gmail.com',
            'professor',
            10000000,
            10000000,
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            subscription_tier = 'professor',
            wallet_balance = 10000000,
            paper_balance = 10000000,
            updated_at = NOW();
    END IF;
END $$;

-- Verifiser oppdateringer
SELECT 
    u.email,
    p.subscription_tier,
    p.wallet_balance,
    p.paper_balance,
    p.updated_at
FROM public.user_profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email IN (
    'tom@klarpakke.no',
    'klarpakke.test+playwright@gmail.com',
    'tomarnejensen@gmail.com'
);
