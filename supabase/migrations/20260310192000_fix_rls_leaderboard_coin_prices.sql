-- Migration: Aktiver RLS for leaderboard_history og coin_prices
-- Issue: #6
-- Created: 2026-03-10 19:20:00 UTC
-- Rollback: ALTER TABLE [table] DISABLE ROW LEVEL SECURITY; DROP POLICY [name] ON [table];

-- ============================================
-- 1. leaderboard_history: Public read, service_role write
-- ============================================

-- Aktiver RLS
ALTER TABLE IF EXISTS leaderboard_history ENABLE ROW LEVEL SECURITY;
-- Policy: Alle kan lese (public leaderboard)
DROP POLICY IF EXISTS leaderboard_history_select_public ON leaderboard_history;
CREATE POLICY leaderboard_history_select_public
    ON leaderboard_history
    FOR SELECT
    USING (true);
-- Policy: Kun service_role kan modifisere
DROP POLICY IF EXISTS leaderboard_history_write_service ON leaderboard_history;
CREATE POLICY leaderboard_history_write_service
    ON leaderboard_history
    FOR ALL
    USING (
        (SELECT current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
    )
    WITH CHECK (
        (SELECT current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
    );
-- ============================================
-- 2. coin_prices: Public read, service_role write
-- ============================================

-- Aktiver RLS
ALTER TABLE IF EXISTS coin_prices ENABLE ROW LEVEL SECURITY;
-- Policy: Alle kan lese prisdata
DROP POLICY IF EXISTS coin_prices_select_public ON coin_prices;
CREATE POLICY coin_prices_select_public
    ON coin_prices
    FOR SELECT
    USING (true);
-- Policy: Kun service_role kan oppdatere priser
DROP POLICY IF EXISTS coin_prices_write_service ON coin_prices;
CREATE POLICY coin_prices_write_service
    ON coin_prices
    FOR ALL
    USING (
        (SELECT current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
    )
    WITH CHECK (
        (SELECT current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
    );
-- ============================================
-- Verifisering:
-- ============================================
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename IN ('leaderboard_history', 'coin_prices');
-- 
-- SELECT tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename IN ('leaderboard_history', 'coin_prices');;
