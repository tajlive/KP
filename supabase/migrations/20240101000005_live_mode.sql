-- Migration: live_mode — idempotent (safe to re-run)
SET statement_timeout = '30s';
-- ============================================================
-- Migration 004: Sprint 10 — Live Mode + Binance Vault
-- ============================================================

-- 1. Enable Vault extension (hvis ikke allerede aktivert)
CREATE EXTENSION IF NOT EXISTS supabase_vault;
-- 2. binance_connections tabell
CREATE TABLE IF NOT EXISTS public.binance_connections (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key_id     TEXT        NOT NULL, -- vault.secret.id
  api_secret_id  TEXT        NOT NULL, -- vault.secret.id
  is_testnet     BOOLEAN     DEFAULT false,
  is_connected   BOOLEAN     DEFAULT false,
  permissions    TEXT[]      DEFAULT ARRAY[]::TEXT[],
  last_verified  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);
ALTER TABLE public.binance_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "binance_conn_own"
  ON public.binance_connections FOR ALL
  USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS binance_conn_user_idx
  ON public.binance_connections (user_id);
-- 3. RPC function for å lagre Vault-nøkler (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.upsert_binance_vault_keys(
  p_user_id UUID,
  p_api_key TEXT,
  p_api_secret TEXT,
  p_is_testnet BOOLEAN DEFAULT false
)
RETURNS TABLE(api_key_id TEXT, api_secret_id TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_api_key_id TEXT;
  v_api_secret_id TEXT;
BEGIN
  -- Store API key in Vault
  INSERT INTO vault.secrets (name, secret)
  VALUES ('binance_api_key_' || p_user_id, p_api_key)
  ON CONFLICT (name) DO UPDATE SET secret = p_api_key
  RETURNING id INTO v_api_key_id;
  
  -- Store API secret in Vault
  INSERT INTO vault.secrets (name, secret)
  VALUES ('binance_api_secret_' || p_user_id, p_api_secret)
  ON CONFLICT (name) DO UPDATE SET secret = p_api_secret
  RETURNING id INTO v_api_secret_id;
  
  -- Update connection record
  INSERT INTO public.binance_connections (user_id, api_key_id, api_secret_id, is_testnet)
  VALUES (p_user_id, v_api_key_id, v_api_secret_id, p_is_testnet)
  ON CONFLICT (user_id) DO UPDATE SET
    api_key_id = v_api_key_id,
    api_secret_id = v_api_secret_id,
    is_testnet = p_is_testnet,
    updated_at = NOW();
  
  RETURN QUERY SELECT v_api_key_id, v_api_secret_id;
END;
$$;
-- 4. RPC function for å hente Vault-nøkler (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_binance_vault_keys(p_user_id UUID)
RETURNS TABLE(api_key TEXT, api_secret TEXT, is_testnet BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT secret FROM vault.secrets WHERE id = bc.api_key_id),
    (SELECT secret FROM vault.secrets WHERE id = bc.api_secret_id),
    bc.is_testnet
  FROM public.binance_connections bc
  WHERE bc.user_id = p_user_id;
END;
$$;
-- 5. Feature flag for live trading
INSERT INTO public.feature_flags (key, enabled, description)
VALUES ('live_trading_enabled', false, 'Enable live trading for all users')
ON CONFLICT (key) DO NOTHING;
