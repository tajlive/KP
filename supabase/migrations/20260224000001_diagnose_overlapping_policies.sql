-- ============================================================================
-- DIAGNOSE: Overlappende RLS-policies
-- ============================================================================
-- Finn tabeller med multiple permissive policies per operasjon
-- som fører til unødvendig CPU-bruk
-- ============================================================================

-- Tabeller med multiple policies per operasjon
SELECT 
  tablename,
  cmd AS operation,
  COUNT(*) AS policy_count,
  string_agg(policyname, ', ') AS policy_names
FROM pg_policies
WHERE policyname NOT LIKE '%Enable RLS%'
GROUP BY tablename, cmd
HAVING COUNT(*) > 1
ORDER BY policy_count DESC, tablename;
-- Total antall tabeller med overlapp
SELECT COUNT(*) AS tables_with_overlaps
FROM (
  SELECT tablename, cmd
  FROM pg_policies
  WHERE policyname NOT LIKE '%Enable RLS%'
  GROUP BY tablename, cmd
  HAVING COUNT(*) > 1
) t;
