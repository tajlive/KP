-- ============================================================
-- Performance Optimization: Strategic Indexes
-- Improves query performance for frequently accessed data
-- ============================================================

-- ============================================================
-- PROFILES TABLE INDEXES
-- ============================================================

-- Search users by role (admin queries)
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON profiles(role);
-- Filter active users
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at
  ON profiles(deleted_at)
  WHERE deleted_at IS NULL;
-- User status lookups
CREATE INDEX IF NOT EXISTS idx_profiles_status_active
  ON profiles(status)
  WHERE status = 'active';
-- ============================================================
-- BETA APPLICATIONS TABLE INDEXES
-- ============================================================

-- Find applications for specific user
CREATE INDEX IF NOT EXISTS idx_beta_applications_user_id
  ON beta_applications(user_id);
-- Filter by status (approved, pending, rejected)
CREATE INDEX IF NOT EXISTS idx_beta_applications_status
  ON beta_applications(status);
-- Recent applications (dashboard)
CREATE INDEX IF NOT EXISTS idx_beta_applications_created_at_desc
  ON beta_applications(created_at DESC);
-- User status check (quick lookup)
CREATE INDEX IF NOT EXISTS idx_beta_applications_user_status
  ON beta_applications(user_id, status);
-- ============================================================
-- TRADES TABLE INDEXES
-- ============================================================

-- User's trades (most common query)
CREATE INDEX IF NOT EXISTS idx_trades_user_id
  ON trades(user_id);
-- User trades by date (pagination)
CREATE INDEX IF NOT EXISTS idx_trades_user_date
  ON trades(user_id, created_at DESC);
-- Filter by trade type (buy/sell analysis)
CREATE INDEX IF NOT EXISTS idx_trades_type
  ON trades(type);
-- User active trades (where status != closed)
CREATE INDEX IF NOT EXISTS idx_trades_user_status
  ON trades(user_id, status)
  WHERE status != 'closed';
-- Recent trades (dashboard)
CREATE INDEX IF NOT EXISTS idx_trades_created_at
  ON trades(created_at DESC);
-- Profit/loss calculations
CREATE INDEX IF NOT EXISTS idx_trades_user_profit
  ON trades(user_id, profit_loss);
-- ============================================================
-- CHART_SIGNALS TABLE INDEXES
-- ============================================================

-- Get signals for specific crypto
CREATE INDEX IF NOT EXISTS idx_chart_signals_symbol
  ON chart_signals(symbol);
-- Recent signals (charts)
CREATE INDEX IF NOT EXISTS idx_chart_signals_timestamp
  ON chart_signals(timestamp DESC);
-- Signal type analysis
CREATE INDEX IF NOT EXISTS idx_chart_signals_type
  ON chart_signals(type);
-- User signal history
CREATE INDEX IF NOT EXISTS idx_chart_signals_user_symbol_time
  ON chart_signals(user_id, symbol, timestamp DESC);
-- ============================================================
-- SUBSCRIPTIONS TABLE INDEXES
-- ============================================================

-- User's current subscription
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
  ON subscriptions(user_id);
-- Active subscriptions (where end_date IS NULL)
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_active
  ON subscriptions(user_id, end_date)
  WHERE end_date IS NULL;
-- Subscription tier distribution
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier
  ON subscriptions(tier);
-- Upcoming renewals
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date
  ON subscriptions(end_date);
-- ============================================================
-- LEARNING_PROGRESS TABLE INDEXES
-- ============================================================

-- User's learning progress (most queries)
CREATE INDEX IF NOT EXISTS idx_learning_progress_user_id
  ON learning_progress(user_id);
-- Completed vs incomplete modules
CREATE INDEX IF NOT EXISTS idx_learning_progress_completed
  ON learning_progress(user_id, completed)
  WHERE completed = false;
-- Course progress
CREATE INDEX IF NOT EXISTS idx_learning_progress_course
  ON learning_progress(user_id, course_id);
-- ============================================================
-- NOTIFICATIONS TABLE INDEXES
-- ============================================================

-- User's notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON notifications(user_id);
-- Unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_read
  ON notifications(user_id, read)
  WHERE read = false;
-- Recent notifications (feed)
CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON notifications(user_id, created_at DESC);
-- ============================================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================================

-- User authentication + status check
CREATE INDEX IF NOT EXISTS idx_profiles_auth_status
  ON profiles(email, status);
-- Trading analysis: user + coin + time
CREATE INDEX IF NOT EXISTS idx_trades_analysis
  ON trades(user_id, coin, created_at DESC);
-- Risk analysis: user + risk level + date
CREATE INDEX IF NOT EXISTS idx_chart_signals_risk
  ON chart_signals(user_id, risk_level, timestamp DESC);
-- ============================================================
-- PARTIAL INDEXES FOR FILTERED QUERIES
-- ============================================================

-- Active beta applications (most queries)
CREATE INDEX IF NOT EXISTS idx_beta_applications_active
  ON beta_applications(created_at DESC)
  WHERE status IN ('pending', 'approved');
-- Open trades (position analysis)
CREATE INDEX IF NOT EXISTS idx_trades_open
  ON trades(user_id, entry_price)
  WHERE status = 'open';
-- High-risk signals (alerts)
CREATE INDEX IF NOT EXISTS idx_chart_signals_high_risk
  ON chart_signals(timestamp DESC)
  WHERE risk_level IN ('high', 'extreme');
-- ============================================================
-- ANALYZE TABLES (FOR QUERY PLANNER)
-- ============================================================

-- Ensure PostgreSQL query planner has fresh statistics
ANALYZE profiles;
ANALYZE beta_applications;
ANALYZE trades;
ANALYZE chart_signals;
ANALYZE subscriptions;
ANALYZE learning_progress;
ANALYZE notifications;
-- ============================================================
-- COMMENT ON INDEXES (for documentation)
-- ============================================================

COMMENT ON INDEX idx_profiles_role IS 'Optimize admin queries filtering by user role';
COMMENT ON INDEX idx_trades_user_date IS 'Primary index for user trade history queries';
COMMENT ON INDEX idx_trades_user_status IS 'Optimize open position queries';
COMMENT ON INDEX idx_chart_signals_timestamp IS 'Optimize recent signal queries for charts';
COMMENT ON INDEX idx_subscriptions_user_active IS 'Quick lookup of user active subscription';
COMMENT ON INDEX idx_notifications_read IS 'Optimize unread notification filtering';
