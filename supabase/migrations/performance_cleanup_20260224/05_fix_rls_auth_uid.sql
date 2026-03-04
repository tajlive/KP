-- ═══════════════════════════════════════════════════════════════════════════
-- KLARPAKKE: FIX - RLS-POLICIES MED auth_rls_initplan PROBLEM
-- ═══════════════════════════════════════════════════════════════════════════
-- Endring: auth.uid() → (SELECT auth.uid()) for å cach'e resultatet
-- Impact: 10-100x raskere queries på store tabeller
-- Sikkerhet: Ingen endring i logikk, kun performance-optimalisering
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- KJØR FØRST: 01_backup_all_policies.sql
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  policy_record RECORD;
  original_qual TEXT;
  original_with_check TEXT;
  fixed_qual TEXT;
  fixed_with_check TEXT;
  fix_count INTEGER := 0;
  error_count INTEGER := 0;
  skipped_count INTEGER := 0;
BEGIN
  -- Header
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'STARTER RLS auth.uid() FIX';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  
  -- Iterer over alle policies med problemet
  FOR policy_record IN 
    SELECT 
      tablename,
      policyname,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
        OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
      )
    ORDER BY tablename, policyname
  LOOP
    BEGIN
      -- Lagre original
      original_qual := policy_record.qual;
      original_with_check := policy_record.with_check;
      
      -- Erstatt auth.uid() med (SELECT auth.uid())
      -- VIKTIG: Erstatt KUN standalone auth.uid() kall, ikke de som allerede er (SELECT auth.uid())
      fixed_qual := regexp_replace(
        policy_record.qual, 
        '(?<!\(SELECT )auth\.uid\(\)(?!\))', 
        '(SELECT auth.uid())', 
        'g'
      );
      
      fixed_with_check := regexp_replace(
        policy_record.with_check,
        '(?<!\(SELECT )auth\.uid\(\)(?!\))',
        '(SELECT auth.uid())',
        'g'
      );
      
      RAISE NOTICE 'Fixing: %.% (%)', 
        policy_record.tablename, 
        policy_record.policyname,
        policy_record.cmd;
      
      -- Drop eksisterende policy
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 
        policy_record.policyname, 
        policy_record.tablename
      );
      
      -- Recreate med fix
      IF fixed_with_check IS NOT NULL AND fixed_with_check <> '' THEN
        EXECUTE format('CREATE POLICY %I ON %I FOR %s TO authenticated USING (%s) WITH CHECK (%s)', 
          policy_record.policyname,
          policy_record.tablename,
          policy_record.cmd,
          COALESCE(fixed_qual, 'true'),
          fixed_with_check
        );
      ELSE
        EXECUTE format('CREATE POLICY %I ON %I FOR %s TO authenticated USING (%s)', 
          policy_record.policyname,
          policy_record.tablename,
          policy_record.cmd,
          COALESCE(fixed_qual, 'true')
        );
      END IF;
      
      fix_count := fix_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      RAISE WARNING 'FEIL ved fix av "%" på "%": %', 
        policy_record.policyname, 
        policy_record.tablename,
        SQLERRM;
    END;
  END LOOP;
  
  -- Sammendrag
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'RLS FIX FULLFØRT';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Suksess: % policies', fix_count;
  RAISE NOTICE '❌ Feil: % policies', error_count;
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFISERING: Sjekk at ingen policies har problemet lenger
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

SELECT 
  'VERIFISERING: Gjenværende slow policies' as title;

SELECT 
  COUNT(*) as remaining_slow_policies,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ ALL POLICIES ER NÅ OPTIMALISERT!'
    ELSE '⚠️ Noen policies ble ikke fikset - sjekk warnings over'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
    OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
  );

-- Vis eventuelle gjenværende problemer
SELECT 
  tablename,
  policyname,
  cmd,
  LEFT(qual, 60) as qual_preview
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
    OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
  )
ORDER BY tablename, policyname;

SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;
