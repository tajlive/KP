-- ============================================================================
-- Deprecate store_binance_keys RPC (unused in app runtime)
-- ============================================================================
-- Rationale:
--  - Function is not called from application code.
--  - It depends on Vault/pgsodium internals that trigger db lint permission errors.
--  - Keep decrypt/remove path intact; deprecate write-RPC until a dedicated secure flow
--    is reintroduced with verified Supabase policy compatibility.
-- ============================================================================

DROP FUNCTION IF EXISTS public.store_binance_keys(UUID, TEXT, TEXT, BOOLEAN);
