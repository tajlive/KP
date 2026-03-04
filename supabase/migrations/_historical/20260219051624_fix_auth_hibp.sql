-- ============================================================================
-- CATEGORY 5: Enable leaked password protection (auth_hibp)
-- ============================================================================
-- NOTE: This configuration must be enabled via Supabase Dashboard or CLI.
-- Database migrations cannot modify auth configuration directly.
-- 
-- ACTION REQUIRED:
-- 1. Go to Supabase Dashboard → Authentication → Providers → Email
-- 2. Toggle ON: "Leaked password protection (HIBP)"
-- 
-- OR via CLI:
--   supabase auth config update --password-hibp-enabled true
--
-- This protects users from registering with passwords found in data breaches
-- by checking against HaveIBeenPwned.org database.
-- ============================================================================

-- Add documentation comment
COMMENT ON SCHEMA auth IS 'Auth schema - Leaked password protection should be enabled in Dashboard/CLI';
