-- ============================================
-- LEGG TIL FLERE ADMIN-BRUKERE
-- ============================================

-- Legg til tomarnejensen@gmail.com som admin (hvis ikke allerede)
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'tomarnejensen@gmail.com';

-- Sjekk at det virket
SELECT email, role, first_name, last_name 
FROM profiles 
WHERE email = 'tomarnejensen@gmail.com';

-- For å legge til flere admins i fremtiden, bruk:
-- UPDATE profiles SET role = 'admin' WHERE email = 'ny@email.com';
