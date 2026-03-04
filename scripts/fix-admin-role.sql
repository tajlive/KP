-- ============================================
-- FIX: Sett admin-rolle for tomarnejensen@gmail.com
-- Kjør denne i Supabase SQL Editor:
-- https://app.supabase.com/project/vuxbjlykgmzskxbclquf/sql/new
-- ============================================

-- 1. Sjekk nåværende status
SELECT 
  id,
  email,
  username,
  user_number,
  role,
  subscription_tier,
  subscription_status,
  created_at
FROM profiles 
WHERE email = 'tomarnejensen@gmail.com';

-- 2. Oppdater til admin (kjør denne hvis role ikke er 'admin')
UPDATE profiles 
SET 
  role = 'admin',
  subscription_tier = 'vip_ekstrem',
  subscription_status = 'active',
  user_number = 4100,
  username = 'taj_admin',
  updated_at = NOW()
WHERE email = 'tomarnejensen@gmail.com';

-- 3. Verifiser at endringen ble gjort
SELECT 
  id,
  email,
  username,
  user_number,
  role,
  subscription_tier,
  subscription_status
FROM profiles 
WHERE email = 'tomarnejensen@gmail.com';

-- 4. Sjekk at admin_user_list view fungerer
SELECT * FROM admin_user_list 
WHERE email = 'tomarnejensen@gmail.com';
