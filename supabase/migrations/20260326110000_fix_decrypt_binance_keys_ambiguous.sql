-- db lint: "column reference key_id is ambiguous" — vault.decrypted_secrets kan ha kolonne key_id;
-- blokketikett tvinger parameter-referanse uten å endre RPC-navn (key_id, secret_id).

CREATE OR REPLACE FUNCTION public.decrypt_binance_keys(
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
SET search_path = public, pg_catalog
AS $$
<<fn>>
DECLARE
  decrypted_key TEXT;
  decrypted_secret TEXT;
  is_test BOOLEAN DEFAULT true;
BEGIN
  SELECT ds.decrypted_secret INTO decrypted_key
  FROM vault.decrypted_secrets ds
  WHERE ds.id = fn.key_id;

  SELECT ds.decrypted_secret INTO decrypted_secret
  FROM vault.decrypted_secrets ds
  WHERE ds.id = fn.secret_id;

  IF decrypted_key IS NULL OR decrypted_secret IS NULL THEN
    RAISE EXCEPTION 'API keys not found in vault';
  END IF;

  SELECT COALESCE((s.secret->'custom_data'->>'is_testnet')::BOOLEAN, true)
  INTO is_test
  FROM vault.secrets s
  WHERE s.id = fn.key_id;

  RETURN QUERY SELECT decrypted_key, decrypted_secret, is_test;
END;
$$;
