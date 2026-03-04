-- =====================================================
-- SEED DATA FOR KLARPAKKE
-- =====================================================

-- 1. Opprett courses
INSERT INTO courses (id, title, slug, description, difficulty, duration_minutes, is_published) VALUES
    (gen_random_uuid(), 'Crypto Basics', 'crypto-basics', 'Learn the fundamentals of cryptocurrency', 'beginner', 120, true),
    (gen_random_uuid(), 'Trading 101', 'trading-101', 'Introduction to trading strategies', 'beginner', 180, true),
    (gen_random_uuid(), 'Advanced Technical Analysis', 'advanced-ta', 'Deep dive into chart patterns and indicators', 'advanced', 300, true),
    (gen_random_uuid(), 'Risk Management', 'risk-management', 'How to protect your capital', 'intermediate', 150, true)
ON CONFLICT (slug) DO NOTHING;

-- 2. Hent course IDs for senere bruk
DO $$
DECLARE
    crypto_id UUID;
    trading_id UUID;
    advanced_id UUID;
    risk_id UUID;
BEGIN
    SELECT id INTO crypto_id FROM courses WHERE slug = 'crypto-basics';
    SELECT id INTO trading_id FROM courses WHERE slug = 'trading-101';
    SELECT id INTO advanced_id FROM courses WHERE slug = 'advanced-ta';
    SELECT id INTO risk_id FROM courses WHERE slug = 'risk-management';

    -- 3. Opprett test brukere (disse vil kobles til auth.users når de logger inn)
    -- Merk: I produksjon opprettes profiles automatisk via trigger ved signup
    
    -- Legg til noen beta signups
    INSERT INTO beta_signups (email, source, created_at) VALUES
        ('test1@example.com', 'website', NOW() - INTERVAL '5 days'),
        ('test2@example.com', 'linkedin', NOW() - INTERVAL '3 days'),
        ('test3@example.com', 'email', NOW() - INTERVAL '1 day')
    ON CONFLICT (email) DO NOTHING;

END $$;

-- =====================================================
-- FERDIG!
-- =====================================================
-- 
-- FOR Å FULLFØRE SETUP:
-- 
-- 1. Kjør migrasjonen: 
--    npx supabase db push
--
-- 2. Deretter må du logge inn på nettsiden med 
--    tomarnejensen@gmail.com for å opprette profilen din.
--    Profilen opprettes automatisk via auth trigger.
--
-- 3. Gjør deg selv til admin ved å kjøre:
--    UPDATE profiles SET role = 'admin' WHERE email = 'tomarnejensen@gmail.com';
--
-- =====================================================
