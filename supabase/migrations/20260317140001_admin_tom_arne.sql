-- Grant admin + professor (all tiers) to tomarnejensen@gmail.com
-- Run once: role=admin (API + sidebar), tier=professor (Admin-link + alle tiers)

DO $$
DECLARE
  v_uid UUID;
  v_updated INT;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'tomarnejensen@gmail.com' LIMIT 1;

  IF v_uid IS NULL THEN
    RAISE WARNING 'Bruker tomarnejensen@gmail.com ikke funnet. Logg inn én gang, kjør migrasjonen på nytt.';
    RETURN;
  END IF;

  UPDATE public.user_profiles
  SET role = 'admin', tier = 'professor', updated_at = NOW()
  WHERE id = v_uid;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE 'Admin + professor satt for tomarnejensen@gmail.com (rows: %)', v_updated;
END $$;
