-- OPPDATERING AV ADMIN-ROLLE
-- Kjør denne kommandoen i Supabase SQL Editor:

UPDATE public.users 
SET role = 'admin' 
WHERE email = 'tomarnejensen@gmail.com';

-- Bekreft at endringen ble gjort:
SELECT id, email, role, created_at FROM public.users WHERE email = 'tomarnejensen@gmail.com';
