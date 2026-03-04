-- ═══════════════════════════════════════════════════════════════════════════
-- KLARPAKKE: ROLLBACK - GJENOPPRETT ALLE RLS-POLICIES FRA BACKUP
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️  KUN BRUK DETTE HVIS NOE GIKK GALT MED RLS-FIXENE!
-- ⚠️  Krever at 01_backup_all_policies.sql ble kjort først!
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- SJEKK OM BACKUP FINNES
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

SELECT 
  'SJEKKER OM BACKUP FINNES' as title;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_policies_20260224')
    THEN '✅ Backup funnet - klar til rollback'
    ELSE '❌ Backup IKKE funnet! Kan ikke rollback.'
  END as status;

SELECT 
  'Antall policies i backup:' as info,
  COUNT(*) as count
FROM public.backup_policies_20260224;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK SCRIPT
-- ═══════════════════════════════════════════════════════════════════════════
/*

⚠️  STOPP! Les dette før du kjorer:

1. Denne rollback vil:
   - Droppe ALLE nåværende policies
   - Gjenopprette policies fra backup (før fix)
   - Dette betyr at performance-problemene kommer TILBAKE

2. Rollback bør kun brukes hvis:
   - RLS-fixene brøt noe kritisk i produksjon
   - Auth ikke fungerer som forventet
   - Du har bekreftet at problemet er relatert til policy-endringer

3. For å kjore rollback:
   a) Uncomment scriptet under
   b) Kjor i Supabase Dashboard SQL Editor
   c) Verifiser at auth fungerer
   d) Debug hva som gikk galt

*/

-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK (uncomment for a kjore)
-- ═══════════════════════════════════════════════════════════════════════════

-- BEGIN;
-- 
-- DO $$
-- DECLARE
--   backup_record RECORD;
--   policies_restored INTEGER := 0;
--   policies_failed INTEGER := 0;
-- BEGIN
--   RAISE NOTICE '═══════════════════════════════════════════════════════════════';
--   RAISE NOTICE 'STARTER ROLLBACK AV RLS-POLICIES';
--   RAISE NOTICE '═══════════════════════════════════════════════════════════════';
--   
--   -- Iterer over backup og gjenopprett
--   FOR backup_record IN 
--     SELECT * FROM public.backup_policies_20260224
--     ORDER BY tablename, policyname
--   LOOP
--     BEGIN
--       -- Drop current policy hvis den finnes
--       EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 
--         backup_record.policyname, 
--         backup_record.tablename
--       );
--       
--       -- Gjenopprett fra backup
--       IF backup_record.with_check IS NOT NULL AND backup_record.with_check <> '' THEN
--         EXECUTE format('CREATE POLICY %I ON %I FOR %s TO authenticated USING (%s) WITH CHECK (%s)', 
--           backup_record.policyname,
--           backup_record.tablename,
--           backup_record.cmd,
--           COALESCE(backup_record.qual, 'true'),
--           backup_record.with_check
--         );
--       ELSE
--         EXECUTE format('CREATE POLICY %I ON %I FOR %s TO authenticated USING (%s)', 
--           backup_record.policyname,
--           backup_record.tablename,
--           backup_record.cmd,
--           COALESCE(backup_record.qual, 'true')
--         );
--       END IF;
--       
--       policies_restored := policies_restored + 1;
--       
--     EXCEPTION WHEN OTHERS THEN
--       policies_failed := policies_failed + 1;
--       RAISE WARNING 'Feil ved gjenoppretting av "%" på "%": %', 
--         backup_record.policyname, 
--         backup_record.tablename,
--         SQLERRM;
--     END;
--   END LOOP;
--   
--   RAISE NOTICE '═══════════════════════════════════════════════════════════════';
--   RAISE NOTICE 'ROLLBACK FULLFORT';
--   RAISE NOTICE '═══════════════════════════════════════════════════════════════';
--   RAISE NOTICE 'Gjenopprettet: % policies', policies_restored;
--   RAISE NOTICE 'Feilet: % policies', policies_failed;
--   RAISE NOTICE '═══════════════════════════════════════════════════════════════';
--   
-- END $$;
-- 
-- COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFISERING ETTER ROLLBACK
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

SELECT 
  'VERIFISERING ETTER ROLLBACK' as title;

SELECT 
  'Policies for rollback:' as info,
  COUNT(*) as count
FROM public.backup_policies_20260224;

SELECT 
  'Nåværende policies (etter rollback):' as info,
  COUNT(*) as count
FROM pg_policies
WHERE schemaname = 'public';

SELECT 
  'Slow policies (auth.uid() uten SELECT):' as info,
  COUNT(*) as count
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
    OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
  );

SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;
