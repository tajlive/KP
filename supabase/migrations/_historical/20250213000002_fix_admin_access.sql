-- Fix Admin Access for tomarnejensen@gmail.com
-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. First, let's see current role
SELECT id, email, role, created_at 
FROM profiles 
WHERE email = 'tomarnejensen@gmail.com';

-- 2. Set role to admin (run this if role is not 'admin')
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'tomarnejensen@gmail.com';

-- 3. Verify the change
SELECT id, email, role 
FROM profiles 
WHERE email = 'tomarnejensen@gmail.com';

-- 4. Also ensure the user has a profile record
-- If no profile exists, create one:
INSERT INTO profiles (id, email, role, created_at, updated_at)
SELECT 
  id,
  email,
  'admin',
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'tomarnejensen@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';
