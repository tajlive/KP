-- db lint / remote: admin_change_role refererte public.profiles (mangler ofte etter user_profiles SoT).
-- sync_binance_balances: jsonb_array_elements i FOR-loop ga RECORD → ->> feilet; bruk indeksert jsonb-array.

CREATE OR REPLACE FUNCTION public.admin_change_role(
  p_user_id UUID,
  p_new_role TEXT,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = p_admin_id AND up.role = 'admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin only');
  END IF;

  IF p_new_role NOT IN (
    'admin', 'user', 'beta', 'premium', 'master', 'phd', 'professor'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
  END IF;

  UPDATE public.user_profiles
  SET
    role = p_new_role,
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'new_role', p_new_role
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upgrade_user(
  p_user_id UUID,
  p_new_tier TEXT,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_old_tier TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = p_admin_id AND up.role = 'admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin only');
  END IF;

  SELECT subscription_tier INTO v_old_tier
  FROM public.user_profiles
  WHERE id = p_user_id;

  UPDATE public.user_profiles
  SET
    subscription_tier = p_new_tier,
    subscription_status = 'active',
    updated_at = NOW()
  WHERE id = p_user_id;

  INSERT INTO public.billing_events (user_id, event_type, from_tier, to_tier, metadata)
  VALUES (
    p_user_id,
    'plan_upgraded',
    v_old_tier,
    p_new_tier,
    jsonb_build_object('upgraded_by', p_admin_id, 'upgraded_at', NOW())
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'old_tier', v_old_tier,
    'new_tier', p_new_tier
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_binance_balances(
  p_user_id UUID,
  p_balances JSONB
)
RETURNS TABLE (assets_synced INTEGER, total_usd_value NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_asset TEXT;
  v_free NUMERIC;
  v_locked NUMERIC;
  v_count INTEGER := 0;
  v_total_usd NUMERIC := 0;
  v_item JSONB;
  i INTEGER;
  n INTEGER;
BEGIN
  IF p_balances IS NULL OR jsonb_typeof(p_balances) <> 'array' THEN
    RETURN QUERY SELECT 0, 0::NUMERIC;
    RETURN;
  END IF;

  n := COALESCE(jsonb_array_length(p_balances), 0);
  FOR i IN 0 .. n - 1 LOOP
    v_item := p_balances -> i;
    v_asset := v_item ->> 'asset';
    v_free := COALESCE((v_item ->> 'free')::NUMERIC, 0);
    v_locked := COALESCE((v_item ->> 'locked')::NUMERIC, 0);

    IF v_asset IS NULL OR v_asset = '' THEN
      CONTINUE;
    END IF;

    IF v_free > 0 OR v_locked > 0 THEN
      INSERT INTO public.binance_balances (user_id, asset, free, locked)
      VALUES (p_user_id, v_asset, v_free, v_locked)
      ON CONFLICT (user_id, asset)
      DO UPDATE SET
        free = EXCLUDED.free,
        locked = EXCLUDED.locked,
        updated_at = NOW();

      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_count, v_total_usd;
END;
$$;

COMMENT ON FUNCTION public.admin_change_role(UUID, TEXT, UUID) IS 'Admin role change; uses user_profiles (SoT).';
COMMENT ON FUNCTION public.admin_upgrade_user(UUID, TEXT, UUID) IS 'Admin tier upgrade; uses user_profiles + billing_events.';
COMMENT ON FUNCTION public.sync_binance_balances(UUID, JSONB) IS 'Sync Binance balance array; fixed jsonb loop for db lint.';
