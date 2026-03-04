-- Verifiser at tomarnejensen@gmail.com har admin rolle
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

-- Hvis role ikke er admin, oppdater den
UPDATE profiles 
SET role = 'admin',
    subscription_tier = 'vip_ekstrem',
    subscription_status = 'active',
    user_number = 4100,
    username = 'taj_admin'
WHERE email = 'tomarnejensen@gmail.com';

-- Verifiser etter oppdatering
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
