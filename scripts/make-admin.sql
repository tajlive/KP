-- ============================================================
-- MAKE USER ADMIN
-- ============================================================
-- 
-- Kjør dette i Supabase SQL Editor for å gi en bruker admin-tilgang
-- 
-- Bytt ut 'din-email@example.com' med din faktiske e-postadresse
--

-- 1. Først, sørg for at role-kolonnen eksisterer
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' 
CHECK (role IN ('admin', 'user', 'beta', 'premium'));

-- 2. Sett din bruker som admin
-- BYTT UT DENNE E-POSTADRESEN MED DIN EGEN:
UPDATE profiles 
SET role = 'admin',
    updated_at = NOW()
WHERE email = 'din-email@example.com';  -- <-- ENDRE DENNE!

-- 3. Bekreft at det funket
SELECT id, email, role, created_at 
FROM profiles 
WHERE role = 'admin';

-- ============================================================
-- ALTERNATIV: Hvis du vil gjøre det via user_id istedenfor email:
-- ============================================================
--
-- 1. Finn din user_id først:
--    SELECT id, email FROM auth.users WHERE email = 'din@email.com';
--
-- 2. Oppdater med user_id:
--    UPDATE profiles 
--    SET role = 'admin' 
--    WHERE id = 'din-user-id-her';
--
