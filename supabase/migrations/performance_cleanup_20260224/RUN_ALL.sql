-- ═══════════════════════════════════════════════════════════════════════════
-- KLARPAKKE: KOMPLETT SQL PERFORMANCE CLEANUP
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- INSTRUKSJONER:
-- 1. Kopier HELE denne filen inn i Supabase SQL Editor
-- 2. Kjør steg for steg (merk av med -- etter hvert steg)
-- 3. Kopier output fra hvert steg til Kimi for rapport
--
-- URL: https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf/sql/new
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- STEG 1: BACKUP (ALLTID FØRST!)
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

DROP TABLE IF EXISTS public.backup_policies_20260224;

CREATE TABLE public.backup_policies_20260224 AS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check,
  NOW() as backed_up_at
FROM pg_policies
WHERE schemaname = 'public';

SELECT 
  'BACKUP FULLFØRT' as status,
  COUNT(*) as total_policies_backed_up,
  COUNT(DISTINCT tablename) as tables_with_policies
FROM public.backup_policies_20260224;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEG 2: DIAGNOSTIKK - Slow RLS Policies
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '=== SLOW RLS POLICIES (auth.uid() problem) ===' as section;

SELECT 
  COUNT(*) as total_slow_policies
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
    OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
  );

-- Detaljer per operasjon
WITH slow_policies AS (
  SELECT 
    cmd AS operation,
    CASE 
      WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%' 
      THEN 'USING clause'
      WHEN with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%'
      THEN 'WITH CHECK clause'
      ELSE 'Both'
    END as problem_location
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (
      (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
      OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
    )
)
SELECT operation, problem_location, COUNT(*) as count
FROM slow_policies
GROUP BY operation, problem_location
ORDER BY count DESC;

-- Top 20 tabeller med størst impact
SELECT 
  p.tablename,
  p.policyname,
  p.cmd as operation,
  s.n_live_tup as estimated_rows,
  CASE 
    WHEN s.n_live_tup > 100000 THEN 'KRITISK'
    WHEN s.n_live_tup > 10000 THEN 'HOY'
    ELSE 'MEDIUM'
  END as priority
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
-- STEG 3: DIAGNOSTIKK - Overlappende Policies
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '=== OVERLAPPENDE POLICIES ===' as section;

SELECT 
  tablename,
  cmd as operation,
  COUNT(*) as policy_count,
  array_agg(policyname ORDER BY policyname) as policies
FROM pg_policies
WHERE schemaname = 'public'
  AND permissive = 'PERMISSIVE'
  AND policyname NOT LIKE '%Enable RLS%'
GROUP BY tablename, cmd
HAVING COUNT(*) > 2
ORDER BY policy_count DESC, tablename;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEG 4: DIAGNOSTIKK - Unused Indexes
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '=== UNUSED INDEXES ===' as section;

SELECT 
  COUNT(*) as total_unused_indexes,
  pg_size_pretty(SUM(pg_relation_size(indexrelid))) as total_wasted_space
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
  AND indexrelname NOT LIKE 'pg_%'
  AND indexrelname NOT LIKE '%_pkey'
  AND indexrelname NOT LIKE '%_unique%';

SELECT 
  relname as tablename,
  indexrelname as index_name,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
  AND indexrelname NOT LIKE 'pg_%'
  AND indexrelname NOT LIKE '%_pkey'
  AND indexrelname NOT LIKE '%_unique%'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 30;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEG 5: FIX SLOW RLS-POLICIES (auth.uid() -> (SELECT auth.uid()))
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '=== FIXER SLOW RLS-POLICIES ===' as section;

DO $$
DECLARE
  policy_record RECORD;
  fix_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  FOR policy_record IN 
    SELECT tablename, policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
        OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
      )
  LOOP
    BEGIN
      -- Drop eksisterende policy
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 
        policy_record.policyname, policy_record.tablename);
      
      -- Recreate med (SELECT auth.uid())
      EXECUTE format('CREATE POLICY %I ON %I FOR %s TO authenticated USING (%s) WITH CHECK (%s)',
        policy_record.policyname,
        policy_record.tablename,
        policy_record.cmd,
        REPLACE(policy_record.qual, 'auth.uid()', '(SELECT auth.uid())'),
        REPLACE(COALESCE(policy_record.with_check, 'true'), 'auth.uid()', '(SELECT auth.uid())'));
      
      fix_count := fix_count + 1;
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      RAISE WARNING 'Feil: %', SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Fixed: % policies, Errors: %', fix_count, error_count;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEG 6: VERIFISER FIX
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '=== VERIFISERING ETTER FIX ===' as section;

SELECT 
  COUNT(*) as remaining_slow_policies,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ ALLE FIKSET!'
    ELSE '⚠️ NOEN GJENSTÅR'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
    OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- STEG 7: SETT OPP BOT HEALTH ALERTING
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '=== BOT HEALTH ALERTING ===' as section;

-- Opprett tabell hvis den ikke finnes
CREATE TABLE IF NOT EXISTS public.bot_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'idle',
  last_error TEXT,
  last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_health_status ON public.bot_health(status);
CREATE INDEX IF NOT EXISTS idx_bot_health_heartbeat ON public.bot_health(last_heartbeat);

-- Aktiver pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Fjern gammel jobb
SELECT cron.unschedule('bot-health-monitor');

-- Opprett ny cron-job
SELECT cron.schedule(
  'bot-health-monitor',
  '*/10 * * * *',
  $$
  WITH unhealthy AS (
    SELECT bot_name, status, last_error,
           EXTRACT(EPOCH FROM (NOW() - last_heartbeat))/60 as min_since_heartbeat
    FROM bot_health
    WHERE status = 'error'
       OR status = 'stopped'
       OR last_heartbeat < NOW() - INTERVAL '15 minutes'
  )
  SELECT net.http_post(
    url := 'https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/broadcast-telegram',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'message',
      '🚨 Bot Health Alert: ' || COUNT(*) || ' unhealthy bots
' ||
      string_agg(bot_name || ' (' || status || '): ' || COALESCE(last_error, 'No heartbeat'), '
')
    )
  )
  FROM unhealthy;
  $$
);

SELECT 
  jobname, schedule, active,
  CASE WHEN active THEN '✅ AKTIV' ELSE '❌ INAKTIV' END as status
FROM cron.job WHERE jobname = 'bot-health-monitor';

-- ═══════════════════════════════════════════════════════════════════════════
-- STEG 8: FINAL VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '=== FINAL VERIFICATION ===' as section;

SELECT 
  'Slow RLS policies' as check_item,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' 
    AND ((qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
         OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%'))) as value,
  '0' as target,
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' 
          AND ((qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
               OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%'))) = 0
    THEN '✅'
    ELSE '❌'
  END as status;

SELECT 
  'Overlapping policies' as check_item,
  (SELECT COUNT(*) FROM (SELECT tablename, cmd FROM pg_policies WHERE schemaname = 'public' 
    AND permissive = 'PERMISSIVE' GROUP BY tablename, cmd HAVING COUNT(*) > 2) t)::text as value,
  '< 5' as target,
  CASE 
    WHEN (SELECT COUNT(*) FROM (SELECT tablename, cmd FROM pg_policies WHERE schemaname = 'public' 
          AND permissive = 'PERMISSIVE' GROUP BY tablename, cmd HAVING COUNT(*) > 2) t) < 5
    THEN '✅'
    ELSE '⚠️'
  END as status;

SELECT 
  'Unused indexes' as check_item,
  (SELECT COUNT(*) FROM pg_stat_user_indexes WHERE idx_scan = 0 AND schemaname = 'public'
    AND indexrelname NOT LIKE '%_pkey' AND indexrelname NOT LIKE '%_unique%')::text as value,
  '< 10' as target,
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_stat_user_indexes WHERE idx_scan = 0 AND schemaname = 'public'
          AND indexrelname NOT LIKE '%_pkey' AND indexrelname NOT LIKE '%_unique%') < 10
    THEN '✅'
    ELSE '⚠️'
  END as status;

SELECT 
  'Bot monitoring' as check_item,
  CASE WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'bot-health-monitor' AND active) 
    THEN 'AKTIV' ELSE 'INAKTIV' END as value,
  'AKTIV' as target,
  CASE WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'bot-health-monitor' AND active) 
    THEN '✅' ELSE '❌' END as status;

-- ═══════════════════════════════════════════════════════════════════════════
-- FULLFØRT!
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 'SQL PERFORMANCE CLEANUP FULLFØRT!' as done,
       NOW() as completed_at;
