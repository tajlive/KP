-- ============================================================================
-- SECURE USER BINANCE KEYS METADATA TABLE
-- ============================================================================
-- Purpose:
--   Maintain a per-user metadata row for Binance API key status.
--   Actual API keys/secrets are NEVER stored in this table.
--   They are stored in vault.secrets and decrypted via public.decrypt_binance_keys().
--
-- Alignment:
--   - executor-factory.ts reads user_profiles.binance_api_key_id / binance_api_secret_id
--     and calls decrypt_binance_keys(key_id, secret_id).
--   - This table mirrors those vault UUID references so the /api/binance/keys
--     status endpoint can operate without exposing secrets.
--
-- Idempotency:
--   - Table created with IF NOT EXISTS.
--   - Insecure plaintext columns (api_key / api_secret) are dropped if present.
--   - Vault reference columns (api_key_id / api_secret_id) are added if missing.
--   - RLS policy is dropped/re-created.
--
-- Backfill:
--   - NO automatic backfill from public.trading_api_keys is performed.
--   - trading_api_keys.api_key_encrypted / api_secret_encrypted are AES-256-GCM
--     ciphertext encrypted with an external key (ENCRYPTION_SECRET) that Postgres
--     does not possess. Copying them would either store ciphertext as plaintext
--     or break encryption. Existing keys must be re-submitted through the secure
--     store_binance_keys() / binance-connector flow so they land in vault.secrets.
-- ============================================================================

-- Vault depends on pgsodium; ensure it is enabled before referencing vault.secrets.
CREATE EXTENSION IF NOT EXISTS pgsodium;

DO $$
BEGIN
  -- Create the secure metadata table.  No plaintext secret columns.
  CREATE TABLE IF NOT EXISTS public.user_binance_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    api_key_id UUID REFERENCES vault.secrets(id) ON DELETE SET NULL,
    api_secret_id UUID REFERENCES vault.secrets(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    is_testnet BOOLEAN DEFAULT false,
    last_error TEXT,
    last_validated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id)
  );

  -- Remove any plaintext secret columns that may exist from an insecure version.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_binance_keys'
      AND column_name = 'api_key'
  ) THEN
    ALTER TABLE public.user_binance_keys DROP COLUMN api_key;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_binance_keys'
      AND column_name = 'api_secret'
  ) THEN
    ALTER TABLE public.user_binance_keys DROP COLUMN api_secret;
  END IF;
END $$;

-- Ensure vault reference columns exist (idempotent if table was created above).
ALTER TABLE public.user_binance_keys
  ADD COLUMN IF NOT EXISTS api_key_id UUID REFERENCES vault.secrets(id) ON DELETE SET NULL;

ALTER TABLE public.user_binance_keys
  ADD COLUMN IF NOT EXISTS api_secret_id UUID REFERENCES vault.secrets(id) ON DELETE SET NULL;

-- Index for user lookups.
CREATE INDEX IF NOT EXISTS idx_user_binance_keys_user_id ON public.user_binance_keys(user_id);

-- Ensure one row per user (idempotent if table already exists without the constraint).
CREATE UNIQUE INDEX IF NOT EXISTS user_binance_keys_user_id_key
  ON public.user_binance_keys(user_id);

-- RLS: service_role only.  Authenticated users must never read rows directly.
ALTER TABLE public.user_binance_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_binance_keys FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_role_all ON public.user_binance_keys;
CREATE POLICY service_role_all ON public.user_binance_keys
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS users_own_keys ON public.user_binance_keys;
DROP POLICY IF EXISTS service_role_keys ON public.user_binance_keys;

REVOKE ALL ON public.user_binance_keys FROM PUBLIC;
REVOKE ALL ON public.user_binance_keys FROM authenticated;
GRANT ALL ON public.user_binance_keys TO service_role;
