-- ============================================================
-- KLARPAKKE RLS PERFORMANCE FIX - COMPLETE BUNDLE
-- 
-- Dette fikser alle slow RLS policies (auth.uid() → (SELECT auth.uid()))
-- 
-- INSTRUKSJONER:
-- 1. Gå til https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf/sql
-- 2. Kopier HELE denne filen inn i SQL Editor
-- 3. Kjør (Run)
-- 4. Sjekk resultatet
-- ============================================================

-- ============================================================
-- STEP 0: VERIFISER BACKUP FINNES
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'backup_policies_20260224') THEN
    RAISE EXCEPTION 'Backup table backup_policies_20260224 finnes ikke! Kjør backup først.';
  END IF;
END $$;

-- ============================================================
-- STEP 1: SJEKK NÅVÆRENDE STATUS
-- ============================================================
SELECT '=== STEP 1: STATUS FØR FIX ===' as info;

SELECT 
  'Slow policies' as metric,
  COUNT(*) as count
FROM pg_policies 
WHERE schemaname = 'public'
  AND (
    (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
    OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
  )
UNION ALL
SELECT 
  'Total policies' as metric,
  COUNT(*) as count
FROM pg_policies WHERE schemaname = 'public';

-- ============================================================
-- STEP 2: FIX ALLE SLOW RLS POLICIES
-- ============================================================
SELECT '=== STEP 2: FIXER SLOW POLICIES ===' as info;

DO $$
DECLARE
  policy_record RECORD;
  fixed_count INTEGER := 0;
  new_qual TEXT;
  new_with_check TEXT;
BEGIN
  FOR policy_record IN 
    SELECT schemaname, tablename, policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
        OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
      )
    ORDER BY tablename, policyname
  LOOP
    -- Bytt ut auth.uid() med (SELECT auth.uid())
    new_qual := REPLACE(policy_record.qual, 'auth.uid()', '(SELECT auth.uid())');
    new_with_check := REPLACE(policy_record.with_check, 'auth.uid()', '(SELECT auth.uid())');
    
    -- Drop gammel policy
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
      policy_record.policyname, 
      policy_record.schemaname, 
      policy_record.tablename);
    
    -- Opprett ny policy med fikset expression
    IF policy_record.with_check IS NOT NULL THEN
      EXECUTE format('CREATE POLICY %I ON %I.%I FOR %s TO authenticated USING (%s) WITH CHECK (%s)',
        policy_record.policyname,
        policy_record.schemaname,
        policy_record.tablename,
        policy_record.cmd,
        new_qual,
        new_with_check);
    ELSE
      EXECUTE format('CREATE POLICY %I ON %I.%I FOR %s TO authenticated USING (%s)',
        policy_record.policyname,
        policy_record.schemaname,
        policy_record.tablename,
        policy_record.cmd,
        new_qual);
    END IF;
    
    fixed_count := fixed_count + 1;
    RAISE NOTICE 'Fixed policy: % on %', policy_record.policyname, policy_record.tablename;
  END LOOP;
  
  RAISE NOTICE '============================================';
  RAISE NOTICE 'TOTAL FIXED: % policies', fixed_count;
  RAISE NOTICE '============================================';
END $$;

-- ============================================================
-- STEP 3: VERIFISER AT ALLE ER FIKSET
-- ============================================================
SELECT '=== STEP 3: STATUS ETTER FIX ===' as info;

SELECT 
  'Remaining slow policies' as metric,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ SUCCESS - All policies fixed!'
    ELSE '❌ WARNING - Some policies still need fixing'
  END as status
FROM pg_policies 
WHERE schemaname = 'public'
  AND (
    (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
    OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
  )
UNION ALL
SELECT 
  'Total policies' as metric,
  COUNT(*) as count,
  NULL as status
FROM pg_policies WHERE schemaname = 'public';

-- ============================================================
-- STEP 4: VIS NOEN EKSEMPLER PÅ FIKSEDE POLICIES
-- ============================================================
SELECT '=== STEP 4: EKSEMPLER PÅ FIKSEDE POLICIES ===' as info;

SELECT 
  tablename,
  policyname,
  LEFT(qual, 80) as using_clause_preview
FROM pg_policies 
WHERE schemaname = 'public'
  AND (qual LIKE '%(SELECT auth.uid())%' OR with_check LIKE '%(SELECT auth.uid())%')
ORDER BY tablename, policyname
LIMIT 5;

-- ============================================================
-- FERDIG!
-- ============================================================
SELECT '=== RLS FIX COMPLETE ===' as info, 
       NOW() as completed_at,
       'All slow auth.uid() policies have been optimized to use (SELECT auth.uid())' as message;
