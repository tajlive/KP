-- Drop user_entitlements view to allow schema changes
-- This must run BEFORE 20260201150000_mvp_extensions migration

DROP VIEW IF EXISTS user_entitlements CASCADE;
