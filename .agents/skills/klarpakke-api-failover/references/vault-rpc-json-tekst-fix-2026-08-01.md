# Vault-RPC-fiks: decrypt_binance_keys JSON vs ren-tekst (2026-08-01)

## Symptom

Testnet live-test (`node scripts/testnet-live-test.mjs`) feilet:

```
❌ [782eb85b-...] Vault-dekryptering feilet: invalid input syntax for type json
```

Direkte SQL ga detaljen:

```
ERROR: 22P02: invalid input syntax for type json
DETAIL: Token "2XMLfCbI0AbQh1DIUGCptNSmIBu2" is invalid.
CONTEXT: JSON data, line 1: 2XMLfCbI0AbQh1DIUGCptNSmIBu2...
SQL statement "SELECT COALESCE((s.secret::jsonb->'custom_data'->>'is_testnet')::BOOLEAN, true)
            FROM vault.secrets s WHERE s.id = v_key"
```

## Rotårsak

`store_binance_keys` (migrasjon 20260226000000) lagrer de to vault-radene forskjellig:

| Rad | Format | Eksempel |
|---|---|---|
| API-nøkkel | **Ren tekst** | `2XMLfCbI0AbQh1DIUGCptNSmIBu2...` |
| API-secret | **JSON-tekst** | `{"secret":"...","custom_data":{"is_testnet":true}}` |

Den gamle RPC-en JSON-parset BEGGE (`s.secret->'custom_data'`) → krasj på ren-tekst-nøkkelen.
I tillegg var `vault.secrets.custom_data` en kolonne som ikke finnes — dataen ligger i `secret`-feltet som embedded JSON.

## Fiks (migrasjon 20260801120000_fix_decrypt_binance_keys_json.sql)

```sql
CREATE OR REPLACE FUNCTION decrypt_binance_keys(
  key_id UUID, secret_id UUID  -- ⚠️ navn MÅ beholdes; kalles med disse av ExecutorFactory
)
RETURNS TABLE (api_key TEXT, api_secret TEXT, is_testnet BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_key_id UUID := key_id;          -- alias: unngår kolonne/param-kollisjon (42702)
  v_secret_id UUID := secret_id;
  decrypted_key TEXT;
  decrypted_secret TEXT;
  is_test BOOLEAN DEFAULT true;     -- sikker default: testnet
  secret_json JSONB;
BEGIN
  SELECT ds.decrypted_secret INTO decrypted_key
  FROM vault.decrypted_secrets ds WHERE ds.id = v_key_id;

  SELECT ds.decrypted_secret INTO decrypted_secret
  FROM vault.decrypted_secrets ds WHERE ds.id = v_secret_id;

  IF decrypted_key IS NULL OR decrypted_secret IS NULL THEN
    RAISE EXCEPTION 'API keys not found in vault';
  END IF;

  BEGIN
    secret_json := decrypted_secret::JSONB;
    IF secret_json ? 'secret' THEN
      decrypted_secret := secret_json->>'secret';
      is_test := COALESCE((secret_json->'custom_data'->>'is_testnet')::BOOLEAN, true);
    END IF;
  EXCEPTION WHEN others THEN
    is_test := true;  -- gammelt ren-tekst-format
  END;

  RETURN QUERY SELECT decrypted_key, decrypted_secret, is_test;
END; $$;

REVOKE ALL ON FUNCTION decrypt_binance_keys(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION decrypt_binance_keys(UUID, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION decrypt_binance_keys(UUID, UUID) TO service_role;
```

## Pitfalls underveis

1. **`DROP FUNCTION` først ved param-rename:** forsøkte `p_key_id`/`p_secret_id` direkte →
   `42P13 cannot change name of input parameter "key_id"`. Løsning: `DROP FUNCTION IF EXISTS decrypt_binance_keys(UUID, UUID);` før CREATE. (Men valgte til slutt å BEHOLDE `key_id`/`secret_id` og aliasere internt — da slipper kallere endring.)
2. **`42702 ambiguous column`:** `SELECT decrypted_secret INTO ... FROM vault.decrypted_secrets WHERE id = key_id` uten alias → kollisjon mellom PL/pgSQL-variabel og kolonnenavn. Kvalifiser med tabell-alias: `FROM vault.decrypted_secrets ds WHERE ds.id = v_key_id`.
3. **Parameternavn må matche kallere:** `@supabase/supabase-js` rpc(`decrypt_binance_keys`, {key_id, secret_id}) sender navngitte params — hvis funksjonen har andre navn får man "Could not find the function ... in the schema cache" (schema cache mismatcher).

## Verifisering (uten å lekke nøkler)

```sql
SELECT (api_key IS NOT NULL AND length(api_key) > 5) AS key_ok,
       (api_secret IS NOT NULL AND length(api_secret) > 5) AS secret_ok,
       is_testnet, left(api_key, 4) AS key_prefix
FROM decrypt_binance_keys('<key_id>'::uuid, '<secret_id>'::uuid);
```

⚠️ **Dummy-nøkkel-deteksjon:** ekte Binance-nøkler er ~64 tegn. Prod-kontoen "Trader"
(782eb85b-…) hadde vault-verdier på 21/24 tegn → dummy/testdata. `length(decrypted_secret) < 40`
betyr at radene ikke er ekte nøkler — testnet-testen beviser da kun at KJEDEN virker
(signering + kall-format OK, `-2014 API-key format invalid`), ikke at live-trading er verifisert.
