-- Sett tomarnejensen@gmail.com som admin
UPDATE profiles 
SET role = 'admin',
    updated_at = NOW()
WHERE email = 'tomarnejensen@gmail.com';

-- Verifiser
SELECT id, email, role, created_at 
FROM profiles 
WHERE email = 'tomarnejensen@gmail.com';
