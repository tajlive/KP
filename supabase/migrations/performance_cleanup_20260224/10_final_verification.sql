-- ═══════════════════════════════════════════════════════════════════════════
-- KLARPAKKE: FINAL VERIFICATION - PERFORMANCE CLEANUP
-- ═══════════════════════════════════════════════════════════════════════════
-- Kjor denne for a verifisere at alle fixer er pa plass
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
  '╔═══════════════════════════════════════════════════════════════════╗' as line1,
  '║     KLARPAKKE SQL PERFORMANCE CLEANUP - FINAL VERIFICATION        ║' as line2,
  '╚═══════════════════════════════════════════════════════════════════╝' as line3;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. RLS-POLICIES MED auth_rls_initplan
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

SELECT 
  '1. RLS-POLICIES MED auth.uid() PROBLEM' as check_item;

SELECT 
  COUNT(*) as remaining_slow_policies,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS - Alle policies er optimalisert!'
    ELSE '❌ FAIL - ' || COUNT(*) || ' policies trenger fortsatt fix'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
    OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. OVERLAPPENDE POLICIES
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

SELECT 
  '2. OVERLAPPENDE RLS-POLICIES (>2 per operasjon)' as check_item;

SELECT 
  COUNT(*) as tables_with_many_overlaps,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS - Ingen tabeller med >2 policies per operasjon'
    ELSE '⚠️  WARNING - ' || COUNT(*) || ' tabeller kan optimaliseres mer'
  END as status
FROM (
  SELECT tablename, cmd
  FROM pg_policies
  WHERE schemaname = 'public'
    AND permissive = 'PERMISSIVE'
    AND policyname NOT LIKE '%Enable RLS%'
  GROUP BY tablename, cmd
  HAVING COUNT(*) > 2
) t;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. UNUSED INDEXES
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

SELECT 
  '3. UNUSED INDEXES' as check_item;

SELECT 
  COUNT(*) as unused_indexes,
  pg_size_pretty(SUM(pg_relation_size(indexrelid))) as wasted_space,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS - Ingen unused indexes'
    WHEN COUNT(*) < 10 THEN '⚠️  WARNING - ' || COUNT(*) || ' unused indexes (kan droppes)'
    ELSE '❌ FAIL - ' || COUNT(*) || ' unused indexes (kjør 07_drop_unused_indexes.sql)'
  END as status
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
  AND indexrelname NOT LIKE '%_pkey'
  AND indexrelname NOT LIKE '%_unique%';

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. BOT HEALTH MONITORING
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

SELECT 
  '4. BOT HEALTH MONITORING' as check_item;

SELECT 
  jobname,
  schedule,
  active,
  CASE 
    WHEN active THEN '✅ PASS - Cron-job aktiv'
    ELSE '❌ FAIL - Cron-job inaktiv'
  END as status
FROM cron.job 
WHERE jobname = 'bot-health-monitor'
UNION ALL
SELECT 
  'bot-health-monitor' as jobname,
  'N/A' as schedule,
  false as active,
  '❌ FAIL - Cron-job finnes ikke' as status
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'bot-health-monitor');

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. BACKUP STATUS
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

SELECT 
  '5. BACKUP STATUS' as check_item;

SELECT 
  'backup_policies_20260224' as backup_table,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_policies_20260224')
    THEN '✅ PASS - Backup finnes (' || (SELECT COUNT(*) FROM public.backup_policies_20260224) || ' policies)'
    ELSE '❌ FAIL - Backup mangler!'
  END as status;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. TOTAL PERFORMANCE IMPACT
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

SELECT 
  '6. TOTAL PERFORMANCE IMPACT' as check_item;

SELECT 
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
  (SELECT COUNT(*) FROM pg_stat_user_indexes WHERE schemaname = 'public') as total_indexes,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as total_tables,
  pg_size_pretty(pg_database_size(current_database())) as database_size;

-- ═══════════════════════════════════════════════════════════════════════════
-- SAMMENDRAG
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

SELECT 
  'SAMMENDRAG' as section;

WITH checks AS (
  SELECT 
    'Slow RLS policies' as item,
    COUNT(*) as count,
    0 as target
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (
      (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
      OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
    )
  UNION ALL
  SELECT 
    'Overlapping policies' as item,
    (SELECT COUNT(*) FROM (
      SELECT tablename, cmd
      FROM pg_policies
      WHERE schemaname = 'public'
        AND permissive = 'PERMISSIVE'
      GROUP BY tablename, cmd
      HAVING COUNT(*) > 2
    ) t),
    0 as target
  UNION ALL
  SELECT 
    'Unused indexes' as item,
    (SELECT COUNT(*) FROM pg_stat_user_indexes WHERE idx_scan = 0 AND schemaname = 'public'),
    10 as target
  UNION ALL
  SELECT 
    'Bot monitoring' as item,
    CASE WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'bot-health-monitor' AND active) THEN 0 ELSE 1 END,
    0 as target
)
SELECT 
  item,
  count as current_value,
  target as target_value,
  CASE 
    WHEN count <= target THEN '✅'
    ELSE '❌'
  END as status
FROM checks;

SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

SELECT 
  'Forventet impact i produksjon:' as info;

SELECT 
  '- Dashboard load time: 40-60%% raskere (faerre RLS subqueries)' as impact_1,
  '- Trading API response: 10-20%% raskere (optimaliserte indexes)' as impact_2,
  '- Database CPU: 20-30%% lavere under hoy last' as impact_3,
  '- Proaktiv monitoring: Bot health alerts til Telegram' as impact_4;

SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

-- ═══════════════════════════════════════════════════════════════════════════
-- TEST-KOMMANDOER (kjør for a verifisere at alt fungerer)
-- ═══════════════════════════════════════════════════════════════════════════
/*

TEST 1: Auth fungerer fortsatt
------------------------------
-- Logg inn som vanlig bruker og kjør:
SELECT * FROM trades LIMIT 5;
-- Skal returnere brukerens egne trades

TEST 2: Admin access fungerer
------------------------------
-- Logg inn som admin og kjør:
SELECT * FROM trades LIMIT 5;
-- Skal returnere alle trades (hvis admin-policy eksisterer)

TEST 3: Query performance
------------------------------
EXPLAIN ANALYZE
SELECT * FROM trades
WHERE user_id = (SELECT auth.uid())
ORDER BY created_at DESC
LIMIT 50;
-- Sjekk at execution time er < 100ms for store tabeller

TEST 4: Bot health monitoring
------------------------------
-- Simuler en bot-feil:
INSERT INTO bot_health (bot_name, status, last_error)
VALUES ('test-bot', 'error', 'Test error')
ON CONFLICT (bot_name) DO UPDATE SET status = 'error', last_error = 'Test error';

-- Sjekk at cron-job plukker det opp (vent 10 min eller kjør manuelt)

-- Rydd opp:
DELETE FROM bot_health WHERE bot_name = 'test-bot';

*/

SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator,
  'Verifisering fullfort!' as done,
  '═══════════════════════════════════════════════════════════════════' as separator2;
