-- ============================================================================
-- Fix db lint error: public.store_binance_keys permission denied on pgsodium
-- ============================================================================
-- Problem:
--  - Existing implementation selected from pgsodium.valid_key to set key_id
--  - db lint executes function checks with a role that cannot access pgsodium internals
--  - Result: "permission denied for function _crypto_aead_det_noncegen"
--
-- Approach:
--  - Remove explicit key_id dependency on pgsodium.valid_key
--  - Let Vault use its configured/default key handling
--  - Keep SECURITY DEFINER and add ownership check (auth.uid must match p_user_id)
--  - Preserve function signature used by app code and grants
-- ============================================================================

CREATE OR REPLACE FUNCTION public.store_binance_keys(
  p_user_id UUID,
  p_api_key TEXT,
  p_api_secret TEXT,
  p_is_testnet BOOLEAN DEFAULT true
)
RETURNS TABLE (
  api_key_id UUID,
  api_secret_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, pg_catalog
AS $$
DECLARE
  v_api_key_id UUID;
  v_api_secret_id UUID;
  v_caller UUID;
BEGIN
  v_caller := auth.uid();

  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_caller <> p_user_id THEN
    RAISE EXCEPTION 'Forbidden: cannot store keys for another user';
  END IF;

  IF p_api_key IS NULL OR p_api_secret IS NULL THEN
    RAISE EXCEPTION 'API key and API secret are required';
  END IF;

  -- Store API key in Vault using project default key handling.
  INSERT INTO vault.secrets (
    name,
    secret,
    description
  ) VALUES (
    'binance_api_key_' || p_user_id,
    p_api_key,
    'Binance API key for user ' || p_user_id
  )
  RETURNING id INTO v_api_key_id;

  -- Store API secret with testnet metadata.
  INSERT INTO vault.secrets (
    name,
    secret,
    description
  ) VALUES (
    'binance_api_secret_' || p_user_id,
    jsonb_build_object(
      'secret', p_api_secret,
      'custom_data', jsonb_build_object('is_testnet', p_is_testnet)
    )::TEXT,
    'Binance API secret for user ' || p_user_id
  )
  RETURNING id INTO v_api_secret_id;

  UPDATE public.user_profiles
  SET
    binance_api_key_id = v_api_key_id,
    binance_api_secret_id = v_api_secret_id,
    binance_connected = true,
    updated_at = now()
  WHERE id = p_user_id;

  RETURN QUERY SELECT v_api_key_id, v_api_secret_id;
END;
$$;

REVOKE ALL ON FUNCTION public.store_binance_keys(UUID, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.store_binance_keys(UUID, TEXT, TEXT, BOOLEAN) TO authenticated;
