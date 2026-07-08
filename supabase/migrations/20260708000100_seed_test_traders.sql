-- Create 10 Norwegian test traders with paper accounts
-- Hermes Lead Architect — 2026-07-08

DO $$
DECLARE
  test_users TEXT[][] := ARRAY[
    ARRAY['Ola Nordmann', 'ola.nordmann@klarpakke.test'],
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
    -- Skip if already exists
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = u[2]) THEN
      RAISE NOTICE 'User % already exists', u[2];
      CONTINUE;
    END IF;

    -- Create auth user
    new_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_id,
      'authenticated',
      'authenticated',
      u[2],
      crypt('Test123Krypto', gen_salt('bf')),
      now(),
      jsonb_build_object('full_name', u[1]),
      now(),
      now()
    );

    -- Create profile with trial
    INSERT INTO public.profiles (
      user_id, display_name, subscription_tier,
      subscription_status, trial_started_at, trial_ends_at
    ) VALUES (
      new_id,
      u[1],
      'free',
      'trial',
      now(),
      now() + interval '14 days'
    );

    -- Create paper account with 100k NOK
    INSERT INTO public.paper_accounts (
      user_id, initial_balance, current_balance, total_profit_loss
    ) VALUES (
      new_id,
      100000,
      100000,
      0
    );

    -- Enable auto-trading for this user
    INSERT INTO public.auto_trading_configs (
      user_id, risk_profile_id, is_enabled, strategy, config
    ) VALUES (
      new_id,
      '00000000-0000-0000-0000-000000000001',
      true,
      'multisignal_aktiv',
      jsonb_build_object(
        'symbol', 'BTCUSDT',
        'capital_allocation', 2000,
        'max_trades_per_day', 5,
        'paper_mode', true
      )
    );

    RAISE NOTICE 'Created user: % (% )', u[1], u[2];
  END LOOP;
END $$;
