-- MINIMAL TEST - Kjør denne først for å verifisere tilgang
SELECT 'Test OK' as status, NOW() as time;

-- Sjekk antall policies
SELECT COUNT(*) as total_policies FROM pg_policies WHERE schemaname = 'public';

-- Sjekk antall slow policies
SELECT COUNT(*) as slow_policies 
FROM pg_policies 
WHERE schemaname = 'public'
  AND (
    (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
    OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
  );
