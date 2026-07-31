-- ============================================================
-- RLS-sikring av 6 tabeller som manglet ROW LEVEL SECURITY
-- Funn: Supabase security-advisor (2026-07-31, 11 ERROR)
--   system_flags (kill switch!), jokertrade_guard_log (session_id!),
--   cron_health_events, trade_mistakes, news_events, whale_movements
-- var fullt eksponert for anon/authenticated-rollen.
--
-- Design:
--   - system_flags / jokertrade_guard_log / cron_health_events:
--     KUN service_role (leses kun av Edge Functions + scripts)
--   - trade_mistakes: eier-basert for authenticated + service_role
--   - news_events / whale_movements: offentlige feeds — public SELECT,
--     skriving kun service_role
-- Idempotent: trygt å kjøre flere ganger.
-- ============================================================

-- 1. system_flags — global kill switch, kun service_role
ALTER TABLE public.system_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS system_flags_service ON public.system_flags;
CREATE POLICY system_flags_service
  ON public.system_flags
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. jokertrade_guard_log — inneholder session_id, kun service_role
ALTER TABLE public.jokertrade_guard_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS jokertrade_guard_log_service ON public.jokertrade_guard_log;
CREATE POLICY jokertrade_guard_log_service
  ON public.jokertrade_guard_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. cron_health_events — overvåkingslogg, kun service_role
ALTER TABLE public.cron_health_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cron_health_events_service ON public.cron_health_events;
CREATE POLICY cron_health_events_service
  ON public.cron_health_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. trade_mistakes — brukere ser egne, service_role alt
ALTER TABLE public.trade_mistakes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS trade_mistakes_owner ON public.trade_mistakes;
CREATE POLICY trade_mistakes_owner
  ON public.trade_mistakes
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS trade_mistakes_service ON public.trade_mistakes;
CREATE POLICY trade_mistakes_service
  ON public.trade_mistakes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. news_events — offentlig feed: SELECT for alle, skriv kun service
ALTER TABLE public.news_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS news_events_public_select ON public.news_events;
CREATE POLICY news_events_public_select
  ON public.news_events
  FOR SELECT
  TO anon, authenticated
  USING (true);
DROP POLICY IF EXISTS news_events_service ON public.news_events;
CREATE POLICY news_events_service
  ON public.news_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. whale_movements — offentlig feed: SELECT for alle, skriv kun service
ALTER TABLE public.whale_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS whale_movements_public_select ON public.whale_movements;
CREATE POLICY whale_movements_public_select
  ON public.whale_movements
  FOR SELECT
  TO anon, authenticated
  USING (true);
DROP POLICY IF EXISTS whale_movements_service ON public.whale_movements;
CREATE POLICY whale_movements_service
  ON public.whale_movements
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Verifikasjon
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('system_flags','jokertrade_guard_log','cron_health_events','trade_mistakes','news_events','whale_movements')
ORDER BY tablename;
