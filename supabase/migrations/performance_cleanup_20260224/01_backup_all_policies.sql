-- ═══════════════════════════════════════════════════════════════════════════
-- KLARPAKKE: BACKUP AV ALLE RLS-POLICIES
-- KJØR DENNE FØRST som sikkerhetsnett!
-- ═══════════════════════════════════════════════════════════════════════════
-- Project: klarpakke (vuxbjlykgmzskxbclquf)
-- Date: 2026-02-24
-- Purpose: Backup alle policies før performance cleanup
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- Slett gammel backup hvis den finnes fra samme dato
DROP TABLE IF EXISTS public.backup_policies_20260224;

-- Opprett backup-tabell med alle policies
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

-- Verifiser backup
SELECT 
  '═══════════════════════════════════════════════' as separator;
  
SELECT 
  'BACKUP FULLFØRT' as status,
  COUNT(*) as total_policies_backed_up,
  COUNT(DISTINCT tablename) as tables_with_policies
FROM public.backup_policies_20260224;

SELECT 
  'Top 10 tabeller med flest policies:' as info;

SELECT 
  tablename,
  COUNT(*) as policy_count,
  array_agg(policyname ORDER BY policyname) as policies
FROM public.backup_policies_20260224
GROUP BY tablename
ORDER BY policy_count DESC
LIMIT 10;

SELECT 
  '═══════════════════════════════════════════════' as separator;

COMMIT;

-- Merk: ROLLBACK hvis noe feiler - da beholdes ingen endringer
