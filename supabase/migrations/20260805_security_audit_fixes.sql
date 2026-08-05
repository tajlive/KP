-- ============================================================
-- Sikkerhetsaudit 2026-08-05 (Task 1: API-sikkerhet audit)
-- Fiks 1: Steng bruker-INSERT/UPDATE på user_kraken_keys
--   (klienter kan skrive ukrypterte nøkler via REST; connect-ruten
--    krypterer server-side med service_role — direkte-insert er aldri nødvendig)
--   Behold: SELECT (egen rad, krypterte verdier) + DELETE (koble fra)
-- Fiks 2: RLS på backup_capital_20260803/04 (service_role only)
-- ============================================================

-- ── Fiks 1a: Fjern "Users can insert own kraken keys" ──────────
DROP POLICY IF EXISTS "Users can insert own kraken keys" ON public.user_kraken_keys;

-- ── Fiks 1b: Fjern "Users can update own kraken keys" ───────────
-- Oppdatering av nøkler går kun via /api/kraken/connect (service_role, kryptert)
DROP POLICY IF EXISTS "Users can update own kraken keys" ON public.user_kraken_keys;

-- ── Fiks 2a: RLS på backup_capital_20260803 ─────────────────────
ALTER TABLE public.backup_capital_20260803 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "backup_capital_20260803_service" ON public.backup_capital_20260803;
CREATE POLICY "backup_capital_20260803_service"
  ON public.backup_capital_20260803
  FOR ALL
  TO public
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- ── Fiks 2b: RLS på backup_capital_20260804 ─────────────────────
ALTER TABLE public.backup_capital_20260804 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "backup_capital_20260804_service" ON public.backup_capital_20260804;
CREATE POLICY "backup_capital_20260804_service"
  ON public.backup_capital_20260804
  FOR ALL
  TO public
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- ── Verifikasjonsspørringer (kjør etterpå) ──────────────────────
-- SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname='public' AND rowsecurity=false;  -- skal være TOM
-- SELECT policyname FROM pg_policies WHERE schemaname='public'
--   AND tablename='user_kraken_keys' ORDER BY cmd;  -- kun SELECT/DELETE/Service
