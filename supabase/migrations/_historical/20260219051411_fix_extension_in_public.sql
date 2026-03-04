-- ============================================================================
-- CATEGORY 2: Fix extension_in_public
-- Move pg_net from public to extensions schema
-- ============================================================================

-- Create extensions schema if not exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move pg_net extension to extensions schema
ALTER EXTENSION pg_net SET SCHEMA extensions;
