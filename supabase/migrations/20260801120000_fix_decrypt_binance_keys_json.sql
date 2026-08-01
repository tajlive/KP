-- ============================================================================
-- FIX: decrypt_binance_keys — håndterer både JSON og ren-tekst vault-secrets
-- ============================================================================
-- Prod-bug funnet 2026-08-01 (testnet live-test):
--   store_binance_keys lagrer API-nøkkelen som REN TEKST og secret-en som
--   JSON {secret, custom_data}. Den gamle RPC-en JSON-parset BEGGE
--   (s.secret->'custom_data') → "invalid input syntax for type json" →
--   live-trading krasjet uansett nøkkelkilde.
--
-- Ny versjon:
--   - Dekrypterer begge via vault.decrypted_secrets (tabell-aliasert)
--   - Secret: JSON-parse hvis mulig, ellers ren tekst (gammelt format)
--   - is_testnet: fra custom_data i JSON, default true (sikker default)
--   - Parameternavn key_id/secret_id beholdt (kalles med disse av
--     ExecutorFactory + testscript)

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
  v_key_id UUID := key_id;
  v_secret_id UUID := secret_id;
  decrypted_key TEXT;
  decrypted_secret TEXT;
  is_test BOOLEAN DEFAULT true;
  secret_json JSONB;
BEGIN
  SELECT ds.decrypted_secret INTO decrypted_key
  FROM vault.decrypted_secrets ds
  WHERE ds.id = v_key_id;

  SELECT ds.decrypted_secret INTO decrypted_secret
  FROM vault.decrypted_secrets ds
  WHERE ds.id = v_secret_id;

  IF decrypted_key IS NULL OR decrypted_secret IS NULL THEN
    RAISE EXCEPTION 'API keys not found in vault';
  END IF;

  -- Hvis secret er JSON (nytt format), hent secret-feltet + is_testnet
  BEGIN
    secret_json := decrypted_secret::JSONB;
    IF secret_json ? 'secret' THEN
      decrypted_secret := secret_json->>'secret';
      is_test := COALESCE((secret_json->'custom_data'->>'is_testnet')::BOOLEAN, true);
    END IF;
  EXCEPTION WHEN others THEN
    -- Gammelt format: ren tekst-secret, testnet default true
    is_test := true;
  END;

  RETURN QUERY SELECT decrypted_key, decrypted_secret, is_test;
END;
$$;

REVOKE ALL ON FUNCTION decrypt_binance_keys(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION decrypt_binance_keys(UUID, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION decrypt_binance_keys(UUID, UUID) TO service_role;
