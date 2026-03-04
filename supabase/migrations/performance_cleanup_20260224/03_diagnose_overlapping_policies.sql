-- ═══════════════════════════════════════════════════════════════════════════
-- KLARPAKKE: DIAGNOSE - OVERLAPPENDE RLS-POLICIES
-- ═══════════════════════════════════════════════════════════════════════════
-- Problem: Multiple PERMISSIVE policies per operasjon = OR-sjekk for hver rad
-- Impact: 20-30% CPU-sløsing på auth-sjekker
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 3.1: SAMMENDRAG AV OVERLAPPENDE POLICIES
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

SELECT 
  'SAMMENDRAG: OVERLAPPENDE RLS-POLICIES' as title;

WITH overlapping AS (
  SELECT 
    tablename,
    cmd AS operation,
    COUNT(*) AS policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND permissive = 'PERMISSIVE'
    AND policyname NOT LIKE '%Enable RLS%'
    AND policyname NOT LIKE '%rls%'
  GROUP BY tablename, cmd
  HAVING COUNT(*) > 1
)
SELECT 
  COUNT(DISTINCT tablename) as tables_with_overlaps,
  SUM(policy_count) as total_overlapping_policies,
  MAX(policy_count) as max_policies_per_operation,
  AVG(policy_count)::numeric(10,1) as avg_policies_per_operation
FROM overlapping;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3.2: TABELLER MED OVERLAPP (sortert etter antall policies)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

SELECT 
  'TABELLER MED OVERLAPPENDE POLICIES' as title;

WITH overlapping AS (
  SELECT 
    tablename,
    cmd AS operation,
    COUNT(*) AS policy_count,
    array_agg(policyname ORDER BY policyname) AS policy_names
  FROM pg_policies
  WHERE schemaname = 'public'
    AND permissive = 'PERMISSIVE'
    AND policyname NOT LIKE '%Enable RLS%'
    AND policyname NOT LIKE '%rls%'
  GROUP BY tablename, cmd
  HAVING COUNT(*) > 1
)
SELECT 
  tablename,
  operation,
  policy_count,
  policy_names,
  CASE 
    WHEN policy_count > 5 THEN '🔴 KRITISK - Må konsolideres'
    WHEN policy_count > 3 THEN '🟡 HØY - Bør konsolideres'
    ELSE '🟢 MEDIUM - Kan konsolideres'
  END as priority
FROM overlapping
ORDER BY policy_count DESC, tablename
LIMIT 50;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3.3: DETALJER FOR HVER OVERLAPPENDE POLICY
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

SELECT 
  'DETALJER: Alle overlappende policies' as title;

SELECT 
  p.tablename,
  p.cmd as operation,
  p.policyname,
  LEFT(p.qual, 60) as using_clause_preview
FROM pg_policies p
INNER JOIN (
  SELECT tablename, cmd
  FROM pg_policies
  WHERE schemaname = 'public'
    AND permissive = 'PERMISSIVE'
    AND policyname NOT LIKE '%Enable RLS%'
    AND policyname NOT LIKE '%rls%'
  GROUP BY tablename, cmd
  HAVING COUNT(*) > 1
) sub ON p.tablename = sub.tablename AND p.cmd = sub.cmd
WHERE p.schemaname = 'public'
ORDER BY p.tablename, p.cmd, p.policyname;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3.4: KANDIDATER FOR KONSOLIDERING (tabeller med >2 policies per operasjon)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

SELECT 
  'KONSOLIDERINGSKANDIDATER (>2 policies per operasjon)' as title;

SELECT 
  tablename,
  cmd,
  COUNT(*) as policy_count,
  string_agg(policyname, ', ' ORDER BY policyname) as policies_to_merge
FROM pg_policies
WHERE schemaname = 'public'
  AND permissive = 'PERMISSIVE'
  AND policyname NOT LIKE '%Enable RLS%'
  AND policyname NOT LIKE '%rls%'
GROUP BY tablename, cmd
HAVING COUNT(*) > 2
ORDER BY policy_count DESC, tablename;

SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;
