-- ============================================================================
-- DIAGNOSE: Unused Indexes
-- ============================================================================
-- Finn indexes som aldri har blitt brukt (siste statistikk-reset)
-- ============================================================================

-- Liste over unused indexes
SELECT 
  schemaname,
  relname AS tablename,
  indexrelname AS index_name,
  idx_scan AS scans,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  pg_relation_size(indexrelid) AS size_bytes
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE 'pg_%'
  AND schemaname = 'public'
  -- UNNTAKELSER: Behold disse selv om de er unused
  AND indexrelname NOT LIKE '%_pkey'  -- Primary keys
  AND indexrelname NOT LIKE '%_fkey'  -- Foreign keys
ORDER BY pg_relation_size(indexrelid) DESC;

-- Oppsummering
SELECT 
  COUNT(*) AS unused_index_count,
  pg_size_pretty(SUM(pg_relation_size(indexrelid))) AS total_wasted_space
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE 'pg_%'
  AND schemaname = 'public'
  AND indexrelname NOT LIKE '%_pkey'
  AND indexrelname NOT LIKE '%_fkey';
