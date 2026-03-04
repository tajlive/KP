-- ============================================================================
-- KLA-53: DROP ALL LEGACY TRADING TABLES
-- ============================================================================
-- Kjør dette FØR 001_core_schema.sql for å rydde opp legacy tabeller
-- ============================================================================

BEGIN;

-- Paper trading (gammel)
DROP TABLE IF EXISTS paper_trades CASCADE;
DROP TABLE IF EXISTS paper_simulations CASCADE;
DROP TABLE IF EXISTS leaderboard_entries CASCADE;
DROP TABLE IF EXISTS saved_strategies CASCADE;

-- Auto trading (gammel)
DROP TABLE IF EXISTS auto_trading_trades CASCADE;
DROP TABLE IF EXISTS auto_trading_sessions CASCADE;
DROP TABLE IF EXISTS user_auto_trading_configs CASCADE;
DROP TABLE IF EXISTS auto_trading_strategies CASCADE;
DROP TABLE IF EXISTS auto_trading_backtests CASCADE;
DROP TABLE IF EXISTS auto_trading_settings CASCADE;
DROP TABLE IF EXISTS auto_trading_config CASCADE;

-- Real trading (gammel)
DROP TABLE IF EXISTS real_trades CASCADE;
DROP TABLE IF EXISTS real_trading_configs CASCADE;
DROP TABLE IF EXISTS exchange_credentials CASCADE;
DROP TABLE IF EXISTS real_accounts CASCADE;

-- 001_trading_system (gammel)
DROP TABLE IF EXISTS user_strategies CASCADE;
DROP TABLE IF EXISTS user_portfolios CASCADE;
DROP TABLE IF EXISTS grid_bot_state CASCADE;
DROP TABLE IF EXISTS onboarding_progress CASCADE;

-- Legacy views
DROP VIEW IF EXISTS paper_trades_compat CASCADE;

-- Legacy functions (hvis de finnes og ikke er i bruk)
DROP FUNCTION IF EXISTS update_simulation_stats() CASCADE;
DROP FUNCTION IF EXISTS calculate_win_rate(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

COMMIT;

-- Verifiser at legacy tabeller er borte
DO $$
DECLARE
  remaining INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN (
    'paper_simulations', 'paper_trades', 'leaderboard_entries', 'saved_strategies',
    'auto_trading_sessions', 'auto_trading_trades', 'user_auto_trading_configs',
    'auto_trading_strategies', 'auto_trading_backtests', 'auto_trading_settings',
    'real_trading_configs', 'real_trades', 'exchange_credentials',
    'user_strategies', 'user_portfolios', 'grid_bot_state', 'onboarding_progress'
  );
  
  IF remaining = 0 THEN
    RAISE NOTICE '✅ Alle legacy tabeller slettet';
  ELSE
    RAISE WARNING '⚠️  % legacy tabeller gjenstår', remaining;
  END IF;
END $$;
