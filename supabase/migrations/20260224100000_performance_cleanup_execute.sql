-- ═══════════════════════════════════════════════════════════════════════════
-- KLARPAKKE SQL PERFORMANCE CLEANUP - KJØR DENNE I SUPABASE SQL EDITOR
-- ═══════════════════════════════════════════════════════════════════════════
-- URL: https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf/sql/new
-- Tid estimert: 5-10 minutter
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- STEG 1: BACKUP (ALLTID FØRST!)
-- ═══════════════════════════════════════════════════════════════════════════
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
  '✅ BACKUP FULLFØRT' as status,
  COUNT(*) as total_policies_backed_up,
  COUNT(DISTINCT tablename) as tables_with_policies
FROM public.backup_policies_20260224;
-- ═══════════════════════════════════════════════════════════════════════════
-- STEG 2: DIAGNOSTIKK - Slow RLS Policies (auth.uid() problem)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT '=== SLOW RLS POLICIES (auth.uid() problem) ===' as section;
SELECT 
  COUNT(*) as total_slow_policies,
  ' policies trenger auth.uid() -> (SELECT auth.uid()) fix' as action
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
    OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
  );
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
      RAISE NOTICE 'Feil ved fix av %.%: %', policy_record.tablename, policy_record.policyname, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '✅ Fixed: % policies, ❌ Errors: %', fix_count, error_count;
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
-- 1. Slow RLS policies
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
-- 2. Bot monitoring
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
