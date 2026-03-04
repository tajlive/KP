-- Sprint 12: Gi Tom Arne Jensen (admin) Professor-tier med alle features
-- Kjører automatisk ved neste Supabase migration sync

-- Finn user_id for tomarnejensen@gmail.com
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Hent user_id
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'tomarnejensen@gmail.com'
  LIMIT 1;

  -- Hvis bruker finnes, sett Professor-tier
  IF v_user_id IS NOT NULL THEN
    -- Slett eksisterende subscription hvis den finnes
    DELETE FROM public.subscriptions WHERE user_id = v_user_id;

    -- Opprett ny Professor subscription
    INSERT INTO public.subscriptions (
      user_id,
      tier_slug,
      status,
      current_period_start,
      current_period_end,
      provider,
      stripe_customer_id,
      stripe_subscription_id,
      cancel_at_period_end,
      created_at,
      updated_at
    )
    VALUES (
      v_user_id,
      'professor',
      'active',
      NOW(),
      NOW() + INTERVAL '10 years',  -- 10 år fremover
      'admin_grant',
      NULL,
      NULL,
      false,
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Professor-tier aktivert for tomarnejensen@gmail.com (user_id: %)', v_user_id;
  ELSE
    RAISE WARNING 'Bruker tomarnejensen@gmail.com ikke funnet i auth.users';
  END IF;
END $$;

-- Bekreft at subscription er opprettet
SELECT 
  u.email,
  u.id as user_id,
  s.tier_slug,
  s.status,
  s.current_period_end,
  s.provider
FROM auth.users u
LEFT JOIN public.subscriptions s ON u.id = s.user_id
WHERE u.email = 'tomarnejensen@gmail.com';
