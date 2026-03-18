-- Idempotent RLS Migration (Safe to run multiple times)
-- Migration: 20260202_rls_policies_only.sql
-- Created: 2026-02-02
-- Purpose: Enable RLS and create policies without modifying existing schema

BEGIN;
-- =============================================================================
-- HELPER FUNCTION: Drop policy if exists (PostgreSQL doesn't have DROP POLICY IF EXISTS)
-- =============================================================================

CREATE OR REPLACE FUNCTION drop_policy_if_exists(
  p_policy_name TEXT,
  p_table_name TEXT
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = p_table_name 
      AND policyname = p_policy_name
  ) THEN
    EXECUTE format('DROP POLICY %I ON %I', p_policy_name, p_table_name);
  END IF;
END;
$$;
-- =============================================================================
-- ENABLE RLS ON ALL TABLES (Idempotent)
-- =============================================================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
      AND tablename NOT LIKE 'sql_%'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    RAISE NOTICE 'Enabled RLS on table: %', t;
  END LOOP;
END;
$$;
-- =============================================================================
-- PROFILES TABLE POLICIES (replaces missing users table)
-- =============================================================================

-- Drop existing policies if they exist
SELECT drop_policy_if_exists('profiles_select_own', 'profiles');
SELECT drop_policy_if_exists('profiles_update_own', 'profiles');
SELECT drop_policy_if_exists('profiles_insert_service', 'profiles');
-- Create new policies
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_service"
  ON profiles FOR INSERT
  TO service_role
  WITH CHECK (true);
-- =============================================================================
-- TRADES TABLE POLICIES (if table exists)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trades') THEN
    PERFORM drop_policy_if_exists('trades_select_own', 'trades');
    PERFORM drop_policy_if_exists('trades_insert_own', 'trades');
    PERFORM drop_policy_if_exists('trades_update_own', 'trades');
    PERFORM drop_policy_if_exists('trades_delete_own_paper', 'trades');

    EXECUTE '
      CREATE POLICY "trades_select_own"
        ON trades FOR SELECT
        TO authenticated
        USING (user_id = auth.uid());
    ';

    EXECUTE '
      CREATE POLICY "trades_insert_own"
        ON trades FOR INSERT
        TO authenticated
        WITH CHECK (user_id = auth.uid());
    ';

    -- Only allow updates on non-closed trades
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'status') THEN
      EXECUTE '
        CREATE POLICY "trades_update_own"
          ON trades FOR UPDATE
          TO authenticated
          USING (user_id = auth.uid() AND status != ''CLOSED'')
          WITH CHECK (user_id = auth.uid());
      ';
    ELSE
      EXECUTE '
        CREATE POLICY "trades_update_own"
          ON trades FOR UPDATE
          TO authenticated
          USING (user_id = auth.uid())
          WITH CHECK (user_id = auth.uid());
      ';
    END IF;

    -- Allow deletion of paper trades only
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'trade_type') THEN
      EXECUTE '
        CREATE POLICY "trades_delete_own_paper"
          ON trades FOR DELETE
          TO authenticated
          USING (user_id = auth.uid() AND trade_type = ''PAPER'');
      ';
    END IF;

    RAISE NOTICE 'Created policies for trades table';
  END IF;
END;
$$;
-- =============================================================================
-- SIGNALS TABLE POLICIES (if table exists)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'signals') THEN
    PERFORM drop_policy_if_exists('signals_select_authenticated', 'signals');
    PERFORM drop_policy_if_exists('signals_insert_service', 'signals');
    PERFORM drop_policy_if_exists('signals_update_service', 'signals');

    EXECUTE '
      CREATE POLICY "signals_select_authenticated"
        ON signals FOR SELECT
        TO authenticated
        USING (true);
    ';

    EXECUTE '
      CREATE POLICY "signals_insert_service"
        ON signals FOR INSERT
        TO service_role
        WITH CHECK (true);
    ';

    EXECUTE '
      CREATE POLICY "signals_update_service"
        ON signals FOR UPDATE
        TO service_role
        USING (true);
    ';

    RAISE NOTICE 'Created policies for signals table';
  END IF;
END;
$$;
-- =============================================================================
-- POSITIONS TABLE POLICIES (if table exists)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'positions') THEN
    PERFORM drop_policy_if_exists('positions_select_own', 'positions');
    PERFORM drop_policy_if_exists('positions_insert_own', 'positions');
    PERFORM drop_policy_if_exists('positions_update_own', 'positions');
    PERFORM drop_policy_if_exists('positions_delete_own_closed', 'positions');

    EXECUTE '
      CREATE POLICY "positions_select_own"
        ON positions FOR SELECT
        TO authenticated
        USING (user_id = auth.uid());
    ';

    EXECUTE '
      CREATE POLICY "positions_insert_own"
        ON positions FOR INSERT
        TO authenticated
        WITH CHECK (user_id = auth.uid());
    ';

    EXECUTE '
      CREATE POLICY "positions_update_own"
        ON positions FOR UPDATE
        TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
    ';

    -- Allow deletion of closed positions only
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'positions' AND column_name = 'status') THEN
      EXECUTE '
        CREATE POLICY "positions_delete_own_closed"
          ON positions FOR DELETE
          TO authenticated
          USING (user_id = auth.uid() AND status = ''CLOSED'');
      ';
    END IF;

    RAISE NOTICE 'Created policies for positions table';
  END IF;
END;
$$;
-- =============================================================================
-- SUBSCRIPTIONS TABLE POLICIES (if table exists)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
    PERFORM drop_policy_if_exists('subscriptions_select_own', 'subscriptions');
    PERFORM drop_policy_if_exists('subscriptions_insert_service', 'subscriptions');
    PERFORM drop_policy_if_exists('subscriptions_update_service', 'subscriptions');

    EXECUTE '
      CREATE POLICY "subscriptions_select_own"
        ON subscriptions FOR SELECT
        TO authenticated
        USING (user_id = auth.uid());
    ';

    EXECUTE '
      CREATE POLICY "subscriptions_insert_service"
        ON subscriptions FOR INSERT
        TO service_role
        WITH CHECK (true);
    ';

    EXECUTE '
      CREATE POLICY "subscriptions_update_service"
        ON subscriptions FOR UPDATE
        TO service_role
        USING (true);
    ';

    RAISE NOTICE 'Created policies for subscriptions table';
  END IF;
END;
$$;
-- =============================================================================
-- RISK_SETTINGS TABLE POLICIES (if table exists)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'risk_settings') THEN
    PERFORM drop_policy_if_exists('risk_settings_select_own', 'risk_settings');
    PERFORM drop_policy_if_exists('risk_settings_insert_own', 'risk_settings');
    PERFORM drop_policy_if_exists('risk_settings_update_own', 'risk_settings');

    EXECUTE '
      CREATE POLICY "risk_settings_select_own"
        ON risk_settings FOR SELECT
        TO authenticated
        USING (user_id = auth.uid());
    ';

    EXECUTE '
      CREATE POLICY "risk_settings_insert_own"
        ON risk_settings FOR INSERT
        TO authenticated
        WITH CHECK (user_id = auth.uid());
    ';

    EXECUTE '
      CREATE POLICY "risk_settings_update_own"
        ON risk_settings FOR UPDATE
        TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
    ';

    RAISE NOTICE 'Created policies for risk_settings table';
  END IF;
END;
$$;
-- =============================================================================
-- AUDIT_LOGS TABLE POLICIES (if table exists)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    PERFORM drop_policy_if_exists('audit_logs_select_own', 'audit_logs');
    PERFORM drop_policy_if_exists('audit_logs_insert_service', 'audit_logs');

    EXECUTE '
      CREATE POLICY "audit_logs_select_own"
        ON audit_logs FOR SELECT
        TO authenticated
        USING (user_id = auth.uid());
    ';

    EXECUTE '
      CREATE POLICY "audit_logs_insert_service"
        ON audit_logs FOR INSERT
        TO service_role
        WITH CHECK (true);
    ';

    RAISE NOTICE 'Created policies for audit_logs table';
  END IF;
END;
$$;
-- =============================================================================
-- STORAGE POLICIES (if storage.objects table exists)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
    -- Drop existing storage policies
    PERFORM drop_policy_if_exists('storage_insert_own', 'objects');
    PERFORM drop_policy_if_exists('storage_select_own', 'objects');
    PERFORM drop_policy_if_exists('storage_update_own', 'objects');
    PERFORM drop_policy_if_exists('storage_delete_own', 'objects');
    PERFORM drop_policy_if_exists('storage_select_public', 'objects');

    -- Create storage policies
    EXECUTE '
      CREATE POLICY "storage_insert_own"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (
          bucket_id = ''user-uploads'' AND 
          (storage.foldername(name))[1] = auth.uid()::text
        );
    ';

    EXECUTE '
      CREATE POLICY "storage_select_own"
        ON storage.objects FOR SELECT
        TO authenticated
        USING (
          bucket_id = ''user-uploads'' AND 
          (storage.foldername(name))[1] = auth.uid()::text
        );
    ';

    EXECUTE '
      CREATE POLICY "storage_update_own"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING (
          bucket_id = ''user-uploads'' AND 
          (storage.foldername(name))[1] = auth.uid()::text
        );
    ';

    EXECUTE '
      CREATE POLICY "storage_delete_own"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (
          bucket_id = ''user-uploads'' AND 
          (storage.foldername(name))[1] = auth.uid()::text
        );
    ';

    EXECUTE '
      CREATE POLICY "storage_select_public"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = ''public-assets'');
    ';

    RAISE NOTICE 'Created storage policies';
  END IF;
END;
$$;
-- =============================================================================
-- VERIFICATION: Show RLS status for all tables
-- =============================================================================

DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'RLS STATUS VERIFICATION';
  RAISE NOTICE '================================================';
  
  FOR rec IN 
    SELECT 
      schemaname,
      tablename,
      rowsecurity,
      (SELECT COUNT(*) FROM pg_policies WHERE schemaname = t.schemaname AND tablename = t.tablename) as policy_count
    FROM pg_tables t
    WHERE schemaname = 'public'
    ORDER BY tablename
  LOOP
    RAISE NOTICE 'Table: %.% | RLS: % | Policies: %', 
      rec.schemaname, 
      rec.tablename, 
      CASE WHEN rec.rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END,
      rec.policy_count;
  END LOOP;
  
  RAISE NOTICE '================================================';
END;
$$;
-- Clean up helper function
DROP FUNCTION IF EXISTS drop_policy_if_exists(TEXT, TEXT);
COMMIT;
-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ RLS migration completed successfully!';
  RAISE NOTICE '✅ All tables now have Row Level Security enabled';
  RAISE NOTICE '✅ Policies created for user data isolation';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next steps:';
  RAISE NOTICE '   1. Test RLS policies with a test user';
  RAISE NOTICE '   2. Verify users can only see their own data';
  RAISE NOTICE '   3. Check storage bucket access';
END;
$$;
