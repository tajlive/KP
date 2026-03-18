-- Complete Supabase Schema for Klarpakke Trading Platform
-- Includes all tables for full trading functionality

-- ============================================================================
-- 1. PRICE_ALERTS - User price alert configuration
-- ============================================================================
CREATE TABLE IF NOT EXISTS price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  price_nok FLOAT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('above', 'below')),
  is_active BOOLEAN DEFAULT true,
  triggered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT valid_price CHECK (price_nok > 0)
);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_price_alerts_symbol ON price_alerts(symbol);
-- ============================================================================
-- 2. TRADE_NOTES - User notes on trades for analysis
-- ============================================================================
CREATE TABLE IF NOT EXISTS trade_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trade_id UUID NOT NULL REFERENCES auto_trades(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT valid_note CHECK (LENGTH(note) > 0 AND LENGTH(note) <= 1000)
);
CREATE INDEX IF NOT EXISTS idx_trade_notes_user_id ON trade_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_notes_trade_id ON trade_notes(trade_id);
-- ============================================================================
-- 3. PORTFOLIO_POSITIONS - Current open positions with live P&L
-- ============================================================================
CREATE TABLE IF NOT EXISTS portfolio_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  total_quantity FLOAT NOT NULL,
  avg_entry_price FLOAT NOT NULL,
  current_value_nok FLOAT NOT NULL,
  current_unrealized_pnl_nok FLOAT DEFAULT 0,
  current_unrealized_pnl_percent FLOAT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, symbol),
  CONSTRAINT valid_quantity CHECK (total_quantity > 0),
  CONSTRAINT valid_price CHECK (avg_entry_price > 0)
);
CREATE INDEX IF NOT EXISTS idx_portfolio_positions_user_id ON portfolio_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_positions_symbol ON portfolio_positions(symbol);
-- ============================================================================
-- 4. USER_SETTINGS - User preferences
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  auto_sync_enabled BOOLEAN DEFAULT true,
  sync_interval_minutes INT DEFAULT 5 CHECK (sync_interval_minutes >= 1 AND sync_interval_minutes <= 60),
  price_alert_enabled BOOLEAN DEFAULT true,
  notifications_enabled BOOLEAN DEFAULT true,
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  currency TEXT DEFAULT 'NOK',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
-- ============================================================================
-- 5. NOTIFICATIONS - Notification history
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('price_alert', 'trade_alert', 'sync_error', 'order_filled', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_id TEXT,
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
-- CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sent_at);

-- ============================================================================
-- 6. API_LOGS - Binance API call logging for debugging
-- ============================================================================
CREATE TABLE IF NOT EXISTS api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INT,
  error_message TEXT,
  response_time_ms INT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at);
-- ============================================================================
-- 7. PORTFOLIO_HISTORY - Daily portfolio snapshots for charting
-- ============================================================================
CREATE TABLE IF NOT EXISTS portfolio_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_value_nok FLOAT NOT NULL,
  total_profit_nok FLOAT NOT NULL,
  total_profit_percent FLOAT NOT NULL,
  open_trades INT DEFAULT 0,
  closed_trades_today INT DEFAULT 0,
  best_trade_nok FLOAT,
  worst_trade_nok FLOAT,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, date)
);
CREATE INDEX IF NOT EXISTS idx_portfolio_history_user_id ON portfolio_history(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_history_date ON portfolio_history(date);
-- ============================================================================
-- 8. PENDING_ORDERS - Track live orders placed from dashboard
-- ============================================================================
CREATE TABLE IF NOT EXISTS pending_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  binance_order_id TEXT UNIQUE,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  order_type TEXT NOT NULL CHECK (order_type IN ('market', 'limit')),
  quantity FLOAT NOT NULL,
  price FLOAT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'filled', 'partially_filled', 'cancelled', 'rejected')),
  filled_quantity FLOAT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  filled_at TIMESTAMP,

  CONSTRAINT valid_quantity CHECK (quantity > 0)
);
CREATE INDEX IF NOT EXISTS idx_pending_orders_user_id ON pending_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_orders_status ON pending_orders(status);
-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_orders ENABLE ROW LEVEL SECURITY;
-- Price Alerts
DROP POLICY IF EXISTS "Users can manage own price alerts" ON price_alerts;
CREATE POLICY "Users can manage own price alerts"
  ON price_alerts
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
-- Trade Notes
DROP POLICY IF EXISTS "Users can manage own trade notes" ON trade_notes;
CREATE POLICY "Users can manage own trade notes"
  ON trade_notes
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
-- Portfolio Positions
DROP POLICY IF EXISTS "Users can read own portfolio positions" ON portfolio_positions;
CREATE POLICY "Users can read own portfolio positions"
  ON portfolio_positions
  FOR SELECT
  USING (auth.uid() = user_id);
-- User Settings
DROP POLICY IF EXISTS "Users can manage own settings" ON user_settings;
CREATE POLICY "Users can manage own settings"
  ON user_settings
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
-- Notifications
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
CREATE POLICY "Users can read own notifications"
  ON notifications
  USING (auth.uid() = user_id);
-- API Logs
DROP POLICY IF EXISTS "Users can read own API logs" ON api_logs;
CREATE POLICY "Users can read own API logs"
  ON api_logs
  FOR SELECT
  USING (auth.uid() = user_id);
-- Portfolio History
DROP POLICY IF EXISTS "Users can read own portfolio history" ON portfolio_history;
CREATE POLICY "Users can read own portfolio history"
  ON portfolio_history
  FOR SELECT
  USING (auth.uid() = user_id);
-- Pending Orders
DROP POLICY IF EXISTS "Users can manage own pending orders" ON pending_orders;
CREATE POLICY "Users can manage own pending orders"
  ON pending_orders
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
-- ============================================================================
-- SERVICE ROLE PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON price_alerts TO service_role;
GRANT SELECT, INSERT, UPDATE ON trade_notes TO service_role;
GRANT SELECT, INSERT, UPDATE ON portfolio_positions TO service_role;
GRANT SELECT, INSERT, UPDATE ON user_settings TO service_role;
GRANT SELECT, INSERT ON notifications TO service_role;
GRANT SELECT, INSERT ON api_logs TO service_role;
GRANT SELECT, INSERT ON portfolio_history TO service_role;
GRANT SELECT, INSERT, UPDATE ON pending_orders TO service_role;
-- ============================================================================
-- AUTHENTICATED PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON price_alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON trade_notes TO authenticated;
GRANT SELECT ON portfolio_positions TO authenticated;
GRANT SELECT, UPDATE ON user_settings TO authenticated;
GRANT SELECT ON notifications TO authenticated;
GRANT SELECT ON api_logs TO authenticated;
GRANT SELECT ON portfolio_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON pending_orders TO authenticated;
