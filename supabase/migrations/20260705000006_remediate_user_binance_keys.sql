-- ============================================================================
-- REMEDIATION: Secure user_binance_keys if insecure 20260704000000 ran
-- ============================================================================
-- Background:
--   An earlier version of 20260704000000_add_user_binance_keys.sql created
--   public.user_binance_keys with plaintext-ish columns api_key / api_secret
--   (they were actually copied as ciphertext from trading_api_keys, but stored
--   in TEXT columns without Vault). That version was never merged to main, but
--   may have been applied to production from a side branch.
--
-- Purpose:
--   Drop the insecure columns, add Vault UUID references, and lock down RLS.
--   This migration is idempotent and safe to run even if the table already
--   has the secure schema.
--
-- Data loss note:
--   Any ciphertext copied from trading_api_keys cannot be decrypted inside
--   Postgres (it was encrypted with ENCRYPTION_SECRET outside the DB). Users
--   whose keys only exist in the insecure columns must re-submit them via the
--   secure store_binance_keys() / binance-connector flow.
-- ============================================================================

-- Ensure Vault extension is present so vault.secrets can be referenced.
CREATE EXTENSION IF NOT EXISTS pgsodium;

DO $$
BEGIN
  -- Create the secure metadata table if it does not already exist.
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

  -- Remediate insecure plaintext-ish columns if they exist.
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

-- Ensure Vault reference columns exist (idempotent).
ALTER TABLE public.user_binance_keys
  ADD COLUMN IF NOT EXISTS api_key_id UUID REFERENCES vault.secrets(id) ON DELETE SET NULL;

ALTER TABLE public.user_binance_keys
  ADD COLUMN IF NOT EXISTS api_secret_id UUID REFERENCES vault.secrets(id) ON DELETE SET NULL;

-- Ensure updated_at column exists (used by triggers in historical migrations).
ALTER TABLE public.user_binance_keys
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Index for user lookups.
CREATE INDEX IF NOT EXISTS idx_user_binance_keys_user_id ON public.user_binance_keys(user_id);

-- Ensure one row per user.
CREATE UNIQUE INDEX IF NOT EXISTS user_binance_keys_user_id_key
  ON public.user_binance_keys(user_id);

-- RLS: service_role only. Authenticated users must never read rows directly.
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

-- Audit notice: log how many rows were affected by the remediation.
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT count(*) INTO v_count FROM public.user_binance_keys;
  RAISE NOTICE 'user_binance_keys remediation complete: % rows present (secure schema enforced).', v_count;
END $$;
