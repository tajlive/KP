-- ═══════════════════════════════════════════════════════════════════════════
-- KLARPAKKE: DIAGNOSE - UNUSED INDEXES
-- ═══════════════════════════════════════════════════════════════════════════
-- Problem: Indexes som aldri brukes = sløst diskplass + tregere writes
-- Sikkerhet: Beholder primary keys og unique constraints
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 4.1: SAMMENDRAG AV UNUSED INDEXES
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

SELECT 
  'SAMMENDRAG: UNUSED INDEXES' as title;

SELECT 
  COUNT(*) as total_unused_indexes,
  pg_size_pretty(SUM(pg_relation_size(indexrelid))) as total_wasted_space,
  AVG(pg_relation_size(indexrelid))::bigint as avg_index_size_bytes,
  MIN(idx_scan) as min_scans,
  MAX(idx_scan) as max_scans
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
  AND indexrelname NOT LIKE 'pg_%'
  AND indexrelname NOT LIKE '%_pkey'
  AND indexrelname NOT LIKE '%_unique%'
  AND indexrelname NOT LIKE '%_key'
  AND indexrelname NOT LIKE 'idx_%_unique';

-- ═══════════════════════════════════════════════════════════════════════════
-- 4.2: TOP 30 UNUSED INDEXES (sortert etter størrelse)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

SELECT 
  'TOP 30 UNUSED INDEXES (største først)' as title;

SELECT 
  ROW_NUMBER() OVER (ORDER BY pg_relation_size(indexrelid) DESC) as rank,
  schemaname,
  relname as tablename,
  indexrelname as index_name,
  idx_scan as scans,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
  pg_relation_size(indexrelid) as size_bytes,
  'DROP INDEX IF EXISTS ' || schemaname || '.' || indexrelname || ';' as drop_command
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
  AND indexrelname NOT LIKE 'pg_%'
  AND indexrelname NOT LIKE '%_pkey'
  AND indexrelname NOT LIKE '%_unique%'
  AND indexrelname NOT LIKE '%_key'
  AND indexrelname NOT LIKE 'idx_%_unique'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 30;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4.3: UNUSED INDEXES PER TABELL
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

SELECT 
  'UNUSED INDEXES PER TABELL' as title;

SELECT 
  relname as tablename,
  COUNT(*) as unused_index_count,
  pg_size_pretty(SUM(pg_relation_size(indexrelid))) as wasted_space,
  array_agg(indexrelname ORDER BY pg_relation_size(indexrelid) DESC) as unused_indexes
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
  AND indexrelname NOT LIKE 'pg_%'
  AND indexrelname NOT LIKE '%_pkey'
  AND indexrelname NOT LIKE '%_unique%'
  AND indexrelname NOT LIKE '%_key'
  AND indexrelname NOT LIKE 'idx_%_unique'
GROUP BY relname
ORDER BY SUM(pg_relation_size(indexrelid)) DESC
LIMIT 20;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4.4: GENERER DROP-SCRIPT (kopier output)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

SELECT 
  'GENERERT DROP-SCRIPT (kopier og lim inn i 05_drop_unused_indexes.sql)' as title;

SELECT 
  '-- Total: ' || COUNT(*) || ' unused indexes, ' || pg_size_pretty(SUM(pg_relation_size(indexrelid))) || ' wasted space' as header
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
  AND indexrelname NOT LIKE 'pg_%'
  AND indexrelname NOT LIKE '%_pkey'
  AND indexrelname NOT LIKE '%_unique%'
  AND indexrelname NOT LIKE '%_key'
  AND indexrelname NOT LIKE 'idx_%_unique';

SELECT 
  'DROP INDEX IF EXISTS ' || schemaname || '.' || indexrelname || 
  '; -- ' || pg_size_pretty(pg_relation_size(indexrelid)) || ' | Table: ' || relname as drop_statement
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
  AND indexrelname NOT LIKE 'pg_%'
  AND indexrelname NOT LIKE '%_pkey'
  AND indexrelname NOT LIKE '%_unique%'
  AND indexrelname NOT LIKE '%_key'
  AND indexrelname NOT LIKE 'idx_%_unique'
ORDER BY pg_relation_size(indexrelid) DESC;

SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;
