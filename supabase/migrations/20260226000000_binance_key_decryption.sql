-- ============================================================================
-- BINANCE API KEY DECRYPTION FUNCTION
-- ============================================================================
-- Securely decrypt Binance API keys from Supabase Vault for live trading
-- Only accessible by service role (backend API routes)

-- Function to decrypt Binance keys
CREATE OR REPLACE FUNCTION decrypt_binance_keys(
  key_id UUID,
  secret_id UUID
)
RETURNS TABLE (
  api_key TEXT,
  api_secret TEXT,
  is_testnet BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  decrypted_key TEXT;
  decrypted_secret TEXT;
  is_test BOOLEAN DEFAULT true;
BEGIN
  -- Decrypt API key
  SELECT decrypted_secret INTO decrypted_key
  FROM vault.decrypted_secrets
  WHERE id = key_id;

  -- Decrypt API secret
  SELECT decrypted_secret INTO decrypted_secret
  FROM vault.decrypted_secrets
  WHERE id = secret_id;

  -- Check if keys exist
  IF decrypted_key IS NULL OR decrypted_secret IS NULL THEN
    RAISE EXCEPTION 'API keys not found in vault';
  END IF;

  -- Check metadata for testnet flag
  SELECT
    COALESCE((secret->'custom_data'->>'is_testnet')::BOOLEAN, true)
    INTO is_test
  FROM vault.secrets
  WHERE id = key_id;

  -- Return decrypted keys
  RETURN QUERY SELECT decrypted_key, decrypted_secret, is_test;
END;
$$;
-- Grant access to service role only (not to regular authenticated users)
REVOKE ALL ON FUNCTION decrypt_binance_keys(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION decrypt_binance_keys(UUID, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION decrypt_binance_keys(UUID, UUID) TO service_role;
-- ============================================================================
-- HELPER FUNCTION: Encrypt and store Binance API keys
-- ============================================================================
CREATE OR REPLACE FUNCTION store_binance_keys(
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
AS $$
DECLARE
  v_api_key_id UUID;
  v_api_secret_id UUID;
BEGIN
  -- Store API key in vault
  INSERT INTO vault.secrets (
    name,
    secret,
    description,
    key_id
  ) VALUES (
    'binance_api_key_' || p_user_id,
    p_api_key,
    'Binance API key for user ' || p_user_id,
    (SELECT id FROM pgsodium.valid_key LIMIT 1)
  )
  RETURNING id INTO v_api_key_id;

  -- Store API secret in vault
  INSERT INTO vault.secrets (
    name,
    secret,
    description,
    key_id
  ) VALUES (
    'binance_api_secret_' || p_user_id,
    jsonb_build_object(
      'secret', p_api_secret,
      'custom_data', jsonb_build_object('is_testnet', p_is_testnet)
    )::TEXT,
    'Binance API secret for user ' || p_user_id,
    (SELECT id FROM pgsodium.valid_key LIMIT 1)
  )
  RETURNING id INTO v_api_secret_id;

  -- Update user profile
  UPDATE user_profiles
  SET
    binance_api_key_id = v_api_key_id,
    binance_api_secret_id = v_api_secret_id,
    binance_connected = true,
    updated_at = now()
  WHERE id = p_user_id;

  RETURN QUERY SELECT v_api_key_id, v_api_secret_id;
END;
$$;
-- Grant to authenticated users (they can store their own keys)
GRANT EXECUTE ON FUNCTION store_binance_keys(UUID, TEXT, TEXT, BOOLEAN) TO authenticated;
-- ============================================================================
-- HELPER FUNCTION: Remove Binance API keys
-- ============================================================================
CREATE OR REPLACE FUNCTION remove_binance_keys(
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_api_key_id UUID;
  v_api_secret_id UUID;
BEGIN
  -- Get key IDs
  SELECT binance_api_key_id, binance_api_secret_id
  INTO v_api_key_id, v_api_secret_id
  FROM user_profiles
  WHERE id = p_user_id;

  -- Delete from vault
  IF v_api_key_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = v_api_key_id;
  END IF;

  IF v_api_secret_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = v_api_secret_id;
  END IF;

  -- Update profile
  UPDATE user_profiles
  SET
    binance_api_key_id = NULL,
    binance_api_secret_id = NULL,
    binance_connected = false,
    updated_at = now()
  WHERE id = p_user_id;

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION remove_binance_keys(UUID) TO authenticated;
-- ============================================================================
-- AUDIT LOG: Track key access
-- ============================================================================
CREATE TABLE IF NOT EXISTS binance_key_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('decrypt', 'store', 'remove')),
  success BOOLEAN NOT NULL,
  error_message TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_binance_key_access_user ON binance_key_access_log (user_id, created_at DESC);
-- Enable RLS
ALTER TABLE binance_key_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own key access logs" ON binance_key_access_log
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages logs" ON binance_key_access_log
  FOR ALL USING (auth.role() = 'service_role');
