-- Fix DB lint: ambiguous column in decrypt_binance_keys, can_follow_leader tier type, ensure pgcrypto for digest()
-- Run: npm run db:push (or apply via Supabase Dashboard)

-- 1. Ensure pgcrypto (required if generate_trade_idempotency_key uses digest() on remote)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. decrypt_binance_keys: qualify decrypted_secret with table alias to fix "ambiguous column"
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
  SELECT ds.decrypted_secret INTO decrypted_key
  FROM vault.decrypted_secrets ds
  WHERE ds.id = key_id;

  SELECT ds.decrypted_secret INTO decrypted_secret
  FROM vault.decrypted_secrets ds
  WHERE ds.id = secret_id;

  IF decrypted_key IS NULL OR decrypted_secret IS NULL THEN
    RAISE EXCEPTION 'API keys not found in vault';
  END IF;

  SELECT COALESCE((s.secret->'custom_data'->>'is_testnet')::BOOLEAN, true)
  INTO is_test
  FROM vault.secrets s
  WHERE s.id = key_id;

  RETURN QUERY SELECT decrypted_key, decrypted_secret, is_test;
END;
$$;

-- 3. can_follow_leader: use TEXT for tier (subscription_tier enum may not exist or tier is text slug)
CREATE OR REPLACE FUNCTION can_follow_leader(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_tier TEXT;
  current_follows INTEGER;
  max_follows INTEGER;
BEGIN
  SELECT tier::TEXT INTO user_tier FROM user_profiles WHERE id = p_user_id;
  SELECT COUNT(*) INTO current_follows FROM copy_trading_follows
    WHERE follower_id = p_user_id AND is_active = true;

  max_follows := CASE user_tier
    WHEN 'free' THEN 0
    WHEN 'student' THEN 0
    WHEN 'bachelor' THEN 1
    WHEN 'master' THEN 3
    WHEN 'phd' THEN 999
    WHEN 'professor' THEN 999
    ELSE 0
  END;

  RETURN current_follows < max_follows;
END;
$$ LANGUAGE plpgsql STABLE;
