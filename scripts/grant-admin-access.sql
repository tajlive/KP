-- ============================================================
-- GRANT ADMIN ACCESS TO tomarnejensen@gmail.com
-- ============================================================

-- 1. Ensure role column exists
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' 
CHECK (role IN ('admin', 'user', 'beta', 'premium', 'master', 'phd', 'professor'));

-- 2. Grant admin access
UPDATE profiles 
SET role = 'admin',
    updated_at = NOW()
WHERE email = 'tomarnejensen@gmail.com';

-- 3. Verify
SELECT 
    id,
    email,
    role,
    created_at,
    updated_at
FROM profiles 
WHERE email = 'tomarnejensen@gmail.com';

-- 4. Show all admins
SELECT email, role 
FROM profiles 
WHERE role = 'admin';
