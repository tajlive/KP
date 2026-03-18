-- ============================================================================
-- DIAGNOSE: RLS Policies med auth_rls_initplan problem
-- ============================================================================
-- Dette scriptet identifiserer alle RLS-policies som bruker auth.uid() 
-- uten (SELECT auth.uid()) som fører til 10-100x tregere queries
-- ============================================================================

-- 1. Finn alle policies med suboptimal auth.uid() bruk
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd AS operation,
  qual AS using_clause,
  with_check
FROM pg_policies
WHERE (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
   OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
ORDER BY tablename, cmd;
-- 2. Tell antall
SELECT COUNT(*) AS total_slow_policies
FROM pg_policies
WHERE (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
   OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%');
