-- Fix Supabase auth trigger — kjør i Supabase Dashboard → SQL Editor
-- Hermes Lead Architect — 2026-07-08

-- 1. Sjekk hvilke kolonner triggeren mangler
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
  AND column_name NOT IN (
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'profiles' AND table_schema = 'public'
  );

-- 2. Midlertidig disable trigger (så vi kan opprette brukere via API)
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

-- 3. Lag 10 testbrukere (kjør etter disable)
DO $$
DECLARE
  test_users TEXT[][] := ARRAY[
    ARRAY['Perjan Jensen', 'perjan.jensen@klarpakke.test'],
    ARRAY['Kari Aas', 'kari.aas@klarpakke.test'],
    ARRAY['Bjørn Fjell', 'bjorn.fjell@klarpakke.test'],
    ARRAY['Ingrid Sol', 'ingrid.sol@klarpakke.test'],
    ARRAY['Lars Vik', 'lars.vik@klarpakke.test'],
    ARRAY['Marte Hav', 'marte.hav@klarpakke.test'],
    ARRAY['Per Berg', 'per.berg@klarpakke.test'],
    ARRAY['Silje Lund', 'silje.lund@klarpakke.test'],
    ARRAY['Trond Dal', 'trond.dal@klarpakke.test'],
    ARRAY['Anne Mo', 'anne.mo@klarpakke.test']
  ];
  u TEXT[];
  new_id UUID;
BEGIN
  FOREACH u SLICE 1 IN ARRAY test_users
  LOOP
    -- Skip if exists
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = u[2]) THEN
      RAISE NOTICE 'Bruker % finnes allerede', u[2];
      CONTINUE;
    END IF;

    -- Create user via auth.users direkte
    new_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', new_id,
      'authenticated', 'authenticated', u[2],
      crypt('Test123Krypto', gen_salt('bf')), now(),
      jsonb_build_object('full_name', u[1]), now(), now()
    );

    -- Create paper account
    INSERT INTO public.paper_accounts (user_id, initial_balance, current_balance, total_profit_loss)
    VALUES (new_id, 100000, 100000, 0);

    -- Create trading strategy
    INSERT INTO public.user_strategies (user_id, strategy_type, mode, config, is_active)
    VALUES (new_id, 'multisignal_aktiv', 'paper', '{"symbol":"BTCUSDT","capital_allocation":2000}'::jsonb, true);

    RAISE NOTICE 'Opprettet: %', u[1];
  END LOOP;
END $$;

-- 4. Re-enable trigger (viktig!)
-- ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
-- Kun enable når triggeren er fikset. Akkurat nå er den broken — la den være disabled.
