-- Drop legacy tables (renamed on 2026-03-10, 30-day grace period passed)
DROP TABLE IF EXISTS auto_trades_legacy;
DROP TABLE IF EXISTS live_trades_legacy;
DROP TABLE IF EXISTS trade_history_legacy;
