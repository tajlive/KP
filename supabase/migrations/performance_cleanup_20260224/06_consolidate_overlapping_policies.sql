-- ═══════════════════════════════════════════════════════════════════════════
-- KLARPAKKE: KONSOLIDER OVERLAPPENDE RLS-POLICIES
-- ═══════════════════════════════════════════════════════════════════════════
-- Problem: Multiple PERMISSIVE policies = OR-sjekk for hver rad
-- Løsning: Kombiner til én policy per operasjon hvor mulig
-- Impact: 20-30% CPU-reduksjon på auth-sjekker
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- VIKTIG: Kjør 03_diagnose_overlapping_policies.sql først for å se hvilke
-- tabeller som trenger konsolidering!
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 6.1: IDENTIFISER TABELLER SOM TRENGER KONSOLIDERING
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

SELECT 
  'TABELLER MED >2 POLICIES PER OPERASJON (som bør konsolideres)' as title;

SELECT 
  tablename,
  cmd as operation,
  COUNT(*) as policy_count,
  array_agg(policyname ORDER BY policyname) as current_policies
FROM pg_policies
WHERE schemaname = 'public'
  AND permissive = 'PERMISSIVE'
  AND policyname NOT LIKE '%Enable RLS%'
  AND policyname NOT LIKE '%rls%'
GROUP BY tablename, cmd
HAVING COUNT(*) > 2
ORDER BY policy_count DESC, tablename;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6.2: EKSEMPEL PÅ KONSOLIDERING (tilpass til dine faktiske policies)
-- ═══════════════════════════════════════════════════════════════════════════
/*

EKSEMPEL - tilpass basert på output fra over:

-- For tabellen 'trades' med 4 SELECT policies:
-- 1. "Users can view own trades"
-- 2. "Admins can view all trades"  
-- 3. "Managers can view team trades"
-- 4. "Support can view recent trades"

-- Kombineres til:

BEGIN;

-- Backup
CREATE TEMP TABLE IF NOT EXISTS temp_backup_trades AS
SELECT * FROM pg_policies WHERE tablename = 'trades';

-- Drop gamle policies
DROP POLICY IF EXISTS "Users can view own trades" ON trades;
DROP POLICY IF EXISTS "Admins can view all trades" ON trades;
DROP POLICY IF EXISTS "Managers can view team trades" ON trades;
DROP POLICY IF EXISTS "Support can view recent trades" ON trades;

-- Ny kombinert policy
CREATE POLICY "trades_select_policy" ON trades
FOR SELECT
TO authenticated
USING (
  -- User sees own trades
  user_id = (SELECT auth.uid())
  -- Admin sees all
  OR (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'admin'
  -- Manager sees team trades
  OR (
    (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'manager'
    AND team_id = (SELECT team_id FROM profiles WHERE id = (SELECT auth.uid()))
  )
  -- Support sees trades from last 30 days
  OR (
    (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'support'
    AND created_at > NOW() - INTERVAL '30 days'
  )
);

COMMIT;

*/

-- ═══════════════════════════════════════════════════════════════════════════
-- 6.3: GENERER KONSOLIDERINGSSCRIPT AUTOMATISK
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

SELECT 
  'GENERERER KONSOLIDERINGSSCRIPT (kopier output)' as title;

-- Generer drop-kommandoer for overlappende policies
WITH overlapping_tables AS (
  SELECT 
    tablename,
    cmd,
    COUNT(*) as policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND permissive = 'PERMISSIVE'
    AND policyname NOT LIKE '%Enable RLS%'
    AND policyname NOT LIKE '%rls%'
  GROUP BY tablename, cmd
  HAVING COUNT(*) > 2
)
SELECT 
  '-- === TABLE: ' || p.tablename || ' | OPERATION: ' || p.cmd || ' ===' as section,
  '-- DROP POLICY IF EXISTS "' || p.policyname || '" ON ' || p.tablename || ';' as drop_command,
  '-- -- Original: ' || LEFT(p.qual, 50) as comment
FROM pg_policies p
INNER JOIN overlapping_tables ot ON p.tablename = ot.tablename AND p.cmd = ot.cmd
WHERE p.schemaname = 'public'
ORDER BY p.tablename, p.cmd, p.policyname;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6.4: VERIFISERING ETTER KONSOLIDERING
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

SELECT 
  'VERIFISERING: Tabeller med >2 policies per operasjon (skal være 0)' as title;

SELECT 
  tablename,
  cmd,
  COUNT(*) as policy_count,
  array_agg(policyname) as policies
FROM pg_policies
WHERE schemaname = 'public'
  AND permissive = 'PERMISSIVE'
  AND policyname NOT LIKE '%Enable RLS%'
  AND policyname NOT LIKE '%rls%'
GROUP BY tablename, cmd
HAVING COUNT(*) > 2
ORDER BY policy_count DESC;

SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

-- ═══════════════════════════════════════════════════════════════════════════
-- INSTRUKSJONER:
-- ═══════════════════════════════════════════════════════════════════════════
/*

STEG-FOR-STEG KONSOLIDERING:

1. Kjør 03_diagnose_overlapping_policies.sql først

2. For hver tabell med >2 policies per operasjon:
   
   a) Kopier policy-definisjonene:
      SELECT policyname, qual FROM pg_policies WHERE tablename = 'DIN_TABELL';
   
   b) Analyser logikken:
      - Er det OR-betingelser som kan kombineres?
      - Er det duplisert logikk?
   
   c) Lag ny kombinert policy med alle betingelser OR-sammen
   
   d) Test at auth fortsatt fungerer før du commiter!

3. Kjør denne filen igjen for å verifisere at antall policies er redusert

EKSEMPEL PÅ KOMBINERT POLICY:

CREATE POLICY "consolidated_select_policy" ON trades
FOR SELECT
TO authenticated
USING (
  -- Original policy 1: Own data
  user_id = (SELECT auth.uid())
  
  -- Original policy 2: Admin access
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = (SELECT auth.uid()) 
    AND role = 'admin'
  )
  
  -- Original policy 3: Shared/public data
  OR is_public = true
);

*/
