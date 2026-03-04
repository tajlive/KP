-- CRITICAL: Verify Tom Jensen has admin access
-- This migration ensures the founder has admin role

-- 1. Make sure role column exists
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' 
CHECK (role IN ('admin', 'user', 'beta', 'premium', 'moderator'));

-- 2. Create index if not exists
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 3. Set Tom Jensen as admin (his email from migration 20260212000001_add_role_to_profiles.sql)
UPDATE profiles 
SET role = 'admin',
    updated_at = NOW()
WHERE email = 'tomarnejensen@gmail.com';

-- 4. Also set any @klarpakke.no emails as admin
UPDATE profiles 
SET role = 'admin',
    updated_at = NOW()
WHERE email LIKE '%@klarpakke.no' 
  AND (role IS NULL OR role = 'user');

-- 5. Verify admin users
SELECT id, email, role, updated_at 
FROM profiles 
WHERE role = 'admin';

-- Result message
SELECT 'Admin role verified for tomarnejensen@gmail.com' as status;
