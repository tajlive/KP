-- ═══════════════════════════════════════════════════════════════════════════
-- KLARPAKKE: DROP UNUSED INDEXES
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️  VIKTIG: Kjør 04_diagnose_unused_indexes.sql FØRST!
-- ⚠️  TEST at queries IKKE bruker indexene før du dropper!
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 7.1: VIS NÅVÆRENDE UNUSED INDEXES
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

SELECT 
  'UNUSED INDEXES SOM KAN DROPPES' as title;

SELECT 
  relname as tablename,
  indexrelname as index_name,
  idx_scan as scans,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
  pg_relation_size(indexrelid) as size_bytes
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
  AND indexrelname NOT LIKE 'pg_%'
  AND indexrelname NOT LIKE '%_pkey'      -- Behold primary keys
  AND indexrelname NOT LIKE '%_unique%'   -- Behold unique constraints
  AND indexrelname NOT LIKE '%_key'       -- Behold foreign keys
  AND indexrelname NOT LIKE 'idx_%_unique'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 50;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7.2: TOTAL WASTED SPACE
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

SELECT 
  'TOTAL WASTED SPACE' as title,
  COUNT(*) as unused_index_count,
  pg_size_pretty(SUM(pg_relation_size(indexrelid))) as total_wasted_space
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
  AND indexrelname NOT LIKE 'pg_%'
  AND indexrelname NOT LIKE '%_pkey'
  AND indexrelname NOT LIKE '%_unique%'
  AND indexrelname NOT LIKE '%_key'
  AND indexrelname NOT LIKE 'idx_%_unique';

-- ═══════════════════════════════════════════════════════════════════════════
-- 7.3: DROP KOMMANDOER (kommenter ut de du vil beholde)
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️  VIKTIGE REGLER FØR DROPPING:
-- 1. Sjekk at indexen IKKE er en Primary key, Unique constraint, eller Foreign key
-- 2. Test med EXPLAIN ANALYZE på queries som bruker tabellen
-- 3. Noen indexes kan vaere "unused" pga lav traffikk - overvak i 1 uke forst
-- 4. Nar du er SIKKER, uncomment drop-kommandoene under og kjor

-- ═══════════════════════════════════════════════════════════════════════════
-- DROP SCRIPT (uncomment etter testing)
-- ═══════════════════════════════════════════════════════════════════════════

-- BEGIN;

-- Kopier drop-kommandoer fra output over
-- EKSEMPLER (erstatt med faktiske navn fra 04_diagnose_unused_indexes.sql):

-- DROP INDEX IF EXISTS public.idx_unused_example_1;  -- Saves XX MB
-- DROP INDEX IF EXISTS public.idx_unused_example_2;  -- Saves XX MB

-- COMMIT;


-- ═══════════════════════════════════════════════════════════════════════════
-- 7.4: GENERER DROP-SCRIPT AUTOMATISK
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

SELECT 
  'GENERERT DROP-SCRIPT (kopier og uncomment)' as title;

SELECT 
  '-- Total space to recover: ' || pg_size_pretty(SUM(pg_relation_size(indexrelid))) as header
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
  AND indexrelname NOT LIKE 'pg_%'
  AND indexrelname NOT LIKE '%_pkey'
  AND indexrelname NOT LIKE '%_unique%'
  AND indexrelname NOT LIKE '%_key'
  AND indexrelname NOT LIKE 'idx_%_unique';

SELECT 
  '-- DROP INDEX IF EXISTS ' || schemaname || '.' || indexrelname || '; -- ' || 
  pg_size_pretty(pg_relation_size(indexrelid)) || ' | Table: ' || relname as drop_statement
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
  AND indexrelname NOT LIKE 'pg_%'
  AND indexrelname NOT LIKE '%_pkey'
  AND indexrelname NOT LIKE '%_unique%'
  AND indexrelname NOT LIKE '%_key'
  AND indexrelname NOT LIKE 'idx_%_unique'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 100;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7.5: VERIFISERING ETTER DROP
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

SELECT 
  'VERIFISERING: Gjenvarende unused indexes (skal vare 0 eller lav)' as title;

SELECT 
  COUNT(*) as remaining_unused_indexes,
  pg_size_pretty(SUM(pg_relation_size(indexrelid))) as remaining_wasted_space
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
  AND indexrelname NOT LIKE 'pg_%'
  AND indexrelname NOT LIKE '%_pkey'
  AND indexrelname NOT LIKE '%_unique%'
  AND indexrelname NOT LIKE '%_key'
  AND indexrelname NOT LIKE 'idx_%_unique';

SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

-- ═══════════════════════════════════════════════════════════════════════════
-- INSTRUKSJONER FOR MANUELL PROSESS:
-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Kjor 04_diagnose_unused_indexes.sql
-- 2. Kopier drop-kommandoene fra output
-- 3. For HVER tabell som har unused indexes:
--    a) Test queries: EXPLAIN ANALYZE SELECT * FROM tablename WHERE ...
--    b) Hvis indexen IKKE brukes i EXPLAIN -> OK a droppe
--    c) Lim inn drop-kommandoen i seksjon 7.3 over
-- 4. Kjor BEGIN; + drop-kommandoer + COMMIT;
-- 5. Kjor denne filen igjen for a verifisere
