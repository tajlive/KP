-- ═══════════════════════════════════════════════════════════════════════════
-- KLARPAKKE: DIAGNOSE - RLS-POLICIES MED auth_rls_initplan PROBLEM
-- ═══════════════════════════════════════════════════════════════════════════
-- Problem: auth.uid() kjøres som subquery for hver rad (10-100x tregere)
-- Løsning: Erstatt med (SELECT auth.uid()) for å cach'e resultatet
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 2.1: SAMMENDRAG AV SLOW POLICIES
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

SELECT 
  'SAMMENDRAG: RLS-POLICIES MED auth.uid() PROBLEM' as title;

WITH slow_policies AS (
  SELECT 
    schemaname,
    tablename,
    policyname,
    cmd AS operation,
    qual AS using_clause,
    with_check,
    CASE 
      WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%' 
      THEN 'USING clause'
      WHEN with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%'
      THEN 'WITH CHECK clause'
      ELSE 'Both clauses'
    END as problem_location
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (
      (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
      OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
    )
)
SELECT 
  operation,
  problem_location,
  COUNT(*) as count
FROM slow_policies
GROUP BY operation, problem_location
ORDER BY count DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2.2: TOTALT ANTALL SLOW POLICIES
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  COUNT(*) as total_slow_policies_needing_fix,
  ' policies trenger auth.uid() -> (SELECT auth.uid()) fix' as action
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
    OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 2.3: TOP 20 TABELLER MED STØRST IMPACT (mest data)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;
  
SELECT 
  'TOP 20 TABELLER MED STØRST IMPACT (sortert etter antall rader)' as title;

SELECT 
  ROW_NUMBER() OVER (ORDER BY s.n_live_tup DESC NULLS LAST) as rank,
  p.tablename,
  p.policyname,
  p.cmd as operation,
  s.n_live_tup as estimated_rows,
  CASE 
    WHEN s.n_live_tup > 100000 THEN '🔴 KRITISK (>100k rader)'
    WHEN s.n_live_tup > 10000 THEN '🟡 HØY (10k-100k rader)'
    WHEN s.n_live_tup > 1000 THEN '🟢 MEDIUM (1k-10k rader)'
    ELSE '⚪ LAV (<1k rader)'
  END as priority,
  COALESCE(s.n_live_tup, 0) * 0.01 as estimated_ms_saved_per_query
FROM pg_policies p
LEFT JOIN pg_stat_user_tables s ON s.relname = p.tablename AND s.schemaname = 'public'
WHERE p.schemaname = 'public'
  AND (
    (p.qual LIKE '%auth.uid()%' AND p.qual NOT LIKE '%(SELECT auth.uid())%')
    OR (p.with_check LIKE '%auth.uid()%' AND p.with_check NOT LIKE '%(SELECT auth.uid())%')
  )
ORDER BY s.n_live_tup DESC NULLS LAST
LIMIT 20;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2.4: FULL LISTE (alle slow policies)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;
  
SELECT 
  'FULL LISTE: Alle RLS-policies med auth.uid() problem' as title;

SELECT 
  p.tablename,
  p.policyname,
  p.cmd as operation,
  LEFT(p.qual, 80) as using_clause_preview,
  LEFT(p.with_check, 80) as with_check_preview
FROM pg_policies p
WHERE p.schemaname = 'public'
  AND (
    (p.qual LIKE '%auth.uid()%' AND p.qual NOT LIKE '%(SELECT auth.uid())%')
    OR (p.with_check LIKE '%auth.uid()%' AND p.with_check NOT LIKE '%(SELECT auth.uid())%')
  )
ORDER BY p.tablename, p.policyname;

SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;
