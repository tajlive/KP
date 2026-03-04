-- ============================================================
-- KLARPAKKE RLS PERFORMANCE FIX BUNDLE
-- Kjør dette i Supabase SQL Editor:
-- https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf/sql
-- ============================================================

-- STEP 1: Check current status
SELECT 'CURRENT STATUS' as step;
SELECT 
  COUNT(*) as slow_policies_remaining,
  COUNT(*) FILTER (WHERE qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%') as using_in_qual,
  COUNT(*) FILTER (WHERE with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%') as in_with_check
FROM pg_policies 
WHERE schemaname = 'public'
  AND (
    (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
    OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
  );

-- STEP 2: Show affected tables
SELECT 'AFFECTED TABLES' as step;
SELECT DISTINCT tablename, policyname, 
  CASE 
    WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%' THEN 'USING clause'
    WHEN with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%' THEN 'WITH CHECK clause'
    ELSE 'both'
  END as location
FROM pg_policies 
WHERE schemaname = 'public'
  AND (
    (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
    OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
  )
ORDER BY tablename, policyname
LIMIT 20;

-- STEP 3: Count total policies
SELECT 'TOTAL POLICIES' as step;
SELECT COUNT(*) as total_policies FROM pg_policies WHERE schemaname = 'public';
