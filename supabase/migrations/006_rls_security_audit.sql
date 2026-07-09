-- ===========================================
-- KLA-82: RLS Security Audit Migration
-- Dato: 2026-03-05
-- ===========================================

-- Aktiver RLS på alle tabeller som mangler det
ALTER TABLE IF EXISTS trading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_decision_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bot_configs ENABLE ROW LEVEL SECURITY;
-- ── trading_sessions ──────────────────────
DROP POLICY IF EXISTS "Users see own trading sessions" ON trading_sessions;
CREATE POLICY "Users see own trading sessions"
  ON trading_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
-- ── trades ────────────────────────────────
DROP POLICY IF EXISTS "Users see own trades" ON trades;
CREATE POLICY "Users see own trades"
  ON trades FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
-- ── api_keys ──────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'api_keys') THEN
    DROP POLICY IF EXISTS "Users see own api_keys" ON api_keys;
    CREATE POLICY "Users see own api_keys"
      ON api_keys FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
-- ── ai_decision_log ───────────────────────
DROP POLICY IF EXISTS "Users see own ai decisions" ON ai_decision_log;
CREATE POLICY "Users see own ai decisions"
  ON ai_decision_log FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
-- ── bot_configs ───────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bot_configs') THEN
    DROP POLICY IF EXISTS "Users see own bot configs" ON bot_configs;
    CREATE POLICY "Users see own bot configs"
      ON bot_configs FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
-- ── Verifiser alle policies ───────────────
-- (Denne kjøres ikke automatisk, men kan sjekkes manuelt)
-- SELECT tablename, policyname, cmd 
-- FROM pg_policies 
-- WHERE tablename IN (
--   'trading_sessions', 'trades', 'api_keys', 
--   'ai_decision_log', 'bot_configs'
-- )
-- ORDER BY tablename;;
