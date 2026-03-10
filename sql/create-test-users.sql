-- Opprett test-brukere for E2E-testing
-- Kjør dette i Supabase SQL Editor
-- Passord: bilglass123 (hashet med bcrypt)

-- Merk: auth.users håndteres av Supabase Auth, så vi bruker auth.admin_create_user via Edge Function
-- ELLER oppretter via Supabase Dashboard > Authentication > Users

-- Alternativ 1: Opprett via SQL (krever service_role key)
-- Dette er et SQL-script som kan kjøres via psql eller Supabase SQL Editor

-- Sjekk om brukerne allerede finnes
SELECT id, email, created_at 
FROM auth.users 
WHERE email IN (
  'klarpakke.test+playwright@gmail.com',
  'klarpakke.test+b@gmail.com'
);

-- For å faktisk opprette brukere, bruk en av disse metodene:

-- METODE A: Via Supabase Dashboard (anbefalt for manuell testing)
-- 1. Gå til https://app.supabase.com/project/_/auth/users
-- 2. Klikk "Add user" / "Invite user"
-- 3. Legg til:
--    - klarpakke.test+playwright@gmail.com / bilglass123
--    - klarpakke.test+b@gmail.com / bilglass123
-- 4. Velg "Auto-confirm email" hvis tilgjengelig

-- METODE B: Via Edge Function (hvis du har satt opp admin API)
-- Se kommentar nederst for Node.js-script

-- METODE C: Direkte SQL (krever superuser - fungerer vanligvis ikke i Supabase Cloud)
-- Dette vil IKKE fungere i Supabase Cloud pga sikkerhetsbegrensninger
/*
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'klarpakke.test+playwright@gmail.com',
  crypt('bilglass123', gen_salt('bf')),
  NOW(),
  NULL,
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;
*/
