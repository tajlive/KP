-- One-time: 1 000 000 NOK lekepenger for eierkonto (papir / profil + papir-sesjoner).
-- E-post: tomarnejensen@gmail.com

DO $$
DECLARE
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'tomarnejensen@gmail.com' LIMIT 1;

  IF v_uid IS NULL THEN
    RAISE NOTICE 'owner_paper_balance_1m: auth user not found for tomarnejensen@gmail.com';
    RETURN;
  END IF;

  UPDATE public.user_profiles
  SET
    paper_balance = 1000000,
    updated_at = NOW()
  WHERE id = v_uid;

  UPDATE public.trading_sessions
  SET
    current_capital_nok = 1000000,
    starting_capital_nok = 1000000,
    initial_capital = 1000000,
    current_capital = 1000000,
    updated_at = NOW()
  WHERE user_id = v_uid
    AND mode = 'paper';
END $$;
