-- Add role column to profiles table for admin access
-- This is needed for the admin dashboard to work

-- 1. Add role column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' 
CHECK (role IN ('admin', 'user', 'beta', 'premium'));
-- 2. Create index for role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
-- 3. Update existing users - set tomarnejensen@gmail.com as admin
UPDATE profiles 
SET role = 'admin',
    updated_at = NOW()
WHERE email = 'tomarnejensen@gmail.com';
-- 4. Also update any user with @klarpakke.no email to admin
UPDATE profiles 
SET role = 'admin',
    updated_at = NOW()
WHERE email LIKE '%@klarpakke.no' 
  AND (role IS NULL OR role = 'user');
-- 5. Set default role for users without role
UPDATE profiles 
SET role = 'user'
WHERE role IS NULL;
-- 6. Verify the update
SELECT id, email, role, created_at 
FROM profiles 
WHERE role = 'admin';
-- Done!
SELECT 'Role column added and admin user updated!' as status;
