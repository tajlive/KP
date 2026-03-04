-- ============================================================================
-- CATEGORY 2: Fix extension_in_public
-- pg_net extension location (documented limitation)
-- ============================================================================

-- NOTE: pg_net extension does not support SET SCHEMA.
-- This is a known limitation of the pg_net extension.
-- The extension is safe to keep in public schema as it is not actively used
-- (confirmed: no net.http_post calls in functions, only documented for future use).

-- If pg_net is needed in the future, wrap all net.http_post calls in functions
-- with explicit search_path that excludes user-writable schemas.
