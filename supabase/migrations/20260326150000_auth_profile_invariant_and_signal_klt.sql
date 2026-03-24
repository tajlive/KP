-- Ensure auth->user_profiles invariant and canonical KLT bootstrap on signup.
-- Canonical profile row must use id = auth.users.id and user_id = auth.users.id.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  display_name_val TEXT;
  avatar_url_val TEXT;
BEGIN
  display_name_val := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'Trader'
  );
  avatar_url_val := NEW.raw_user_meta_data->>'avatar_url';

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
  ) THEN
    INSERT INTO public.user_profiles (
      id,
      user_id,
      email,
      display_name,
      full_name,
      avatar_url,
      locale,
      provider,
      role,
      subscription_tier,
      subscription_status,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      NEW.id,
      NEW.email,
      display_name_val,
      display_name_val,
      avatar_url_val,
      COALESCE(NEW.raw_user_meta_data->>'locale', 'no'),
      COALESCE(NEW.raw_user_meta_data->>'provider', 'email'),
      'user',
      'student',
      'inactive',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      email = COALESCE(EXCLUDED.email, user_profiles.email),
      display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
      full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
      locale = COALESCE(EXCLUDED.locale, user_profiles.locale),
      provider = COALESCE(EXCLUDED.provider, user_profiles.provider),
      updated_at = NOW();

    -- Canonical KLT balance row (idempotent).
    INSERT INTO public.user_klt_balances (user_id, balance, total_earned, updated_at)
    VALUES (NEW.id, 500, 500, NOW())
    ON CONFLICT (user_id) DO NOTHING;
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      avatar_url,
      locale,
      provider,
      google_id,
      microsoft_id,
      role,
      subscription_tier,
      subscription_status,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      display_name_val,
      avatar_url_val,
      COALESCE(NEW.raw_user_meta_data->>'locale', 'no'),
      COALESCE(NEW.raw_user_meta_data->>'provider', 'email'),
      NEW.raw_user_meta_data->>'sub',
      NEW.raw_user_meta_data->>'oid',
      'user',
      'student',
      'inactive',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  v_updated INTEGER := 0;
BEGIN
  -- Repair historical rows where id != user_id (legacy drift).
  -- Only repair rows that are not referenced by dependent tables.
  WITH candidates AS (
    SELECT up.id AS old_id, up.user_id AS new_id
    FROM public.user_profiles up
    WHERE up.user_id IS NOT NULL
      AND up.id IS DISTINCT FROM up.user_id
      AND NOT EXISTS (SELECT 1 FROM public.user_profiles u2 WHERE u2.id = up.user_id)
      AND NOT EXISTS (SELECT 1 FROM public.copy_trading_follows f WHERE f.follower_id = up.id OR f.leader_id = up.id)
      AND NOT EXISTS (SELECT 1 FROM public.copy_trade_queue q WHERE q.follower_id = up.id OR q.leader_id = up.id)
      AND NOT EXISTS (SELECT 1 FROM public.notification_queue n WHERE n.user_id = up.id)
      AND NOT EXISTS (SELECT 1 FROM public.archived_trade_summaries a WHERE a.user_id = up.id)
      AND NOT EXISTS (SELECT 1 FROM public.auto_trading_sessions s WHERE s.user_id = up.id)
      AND NOT EXISTS (SELECT 1 FROM public.trading_logs t WHERE t.user_id = up.id)
      AND NOT EXISTS (SELECT 1 FROM public.strategy_reviews r WHERE r.user_id = up.id)
  )
  UPDATE public.user_profiles up
  SET id = c.new_id, user_id = c.new_id, updated_at = NOW()
  FROM candidates c
  WHERE up.id = c.old_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE 'user_profiles invariant repair updated rows: %', v_updated;
END;
$$;
