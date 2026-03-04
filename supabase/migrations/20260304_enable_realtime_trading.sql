-- Phase 1: Enable Supabase Realtime on trading tables
-- These tables will publish changes to connected clients for live dashboards.

-- Enable Realtime on user_strategies (bot status changes)
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS user_strategies;

-- Enable Realtime on auto_trading_sessions (session status changes)
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS auto_trading_sessions;

-- Enable Realtime on trade_history (new trades)
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS trade_history;

-- Enable Realtime on auto_trading_trades (live trade updates)
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS auto_trading_trades;

-- Enable Realtime on strategy_logs (bot action logs)
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS strategy_logs;
