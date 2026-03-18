-- KLA-154: Emergency tables for production launch
-- Created: 2026-03-07
-- Purpose: Fix missing tables blocking dashboard and paper trading

-- ============================================================================
-- 1. PAPER TRADING SESSIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS paper_trading_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  starting_balance DECIMAL(20,8) DEFAULT 10000,
  current_balance DECIMAL(20,8) DEFAULT 10000,
  status TEXT CHECK (status IN ('active', 'paused', 'completed')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_paper_trading_sessions_user_id 
  ON paper_trading_sessions(user_id);
-- RLS
ALTER TABLE paper_trading_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sessions" ON paper_trading_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON paper_trading_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON paper_trading_sessions
  FOR UPDATE USING (auth.uid() = user_id);
-- ============================================================================
-- 2. RISK PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS risk_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  max_position_size DECIMAL(5,2) DEFAULT 10.0,
  stop_loss_pct DECIMAL(5,2) DEFAULT 2.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_risk_profiles_user_id 
  ON risk_profiles(user_id);
-- RLS
ALTER TABLE risk_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own risk profiles" ON risk_profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own risk profiles" ON risk_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
-- ============================================================================
-- 3. AUTO TRADING TRADES (Minimal version for type safety)
-- ============================================================================
CREATE TABLE IF NOT EXISTS auto_trading_trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  status TEXT CHECK (status IN ('OPEN', 'CLOSED', 'STOPPED')) DEFAULT 'OPEN',
  pnl_nok DECIMAL(20,8),
  stop_loss_price DECIMAL(20,8),
  position_value_nok DECIMAL(20,8),
  entry_price DECIMAL(20,8),
  exit_price DECIMAL(20,8),
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_auto_trading_trades_session_id 
  ON auto_trading_trades(session_id);
CREATE INDEX IF NOT EXISTS idx_auto_trading_trades_user_id 
  ON auto_trading_trades(user_id);
-- RLS
ALTER TABLE auto_trading_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own trades" ON auto_trading_trades
  FOR SELECT USING (auth.uid() = user_id);
-- ============================================================================
-- 4. AUTO TRADING SESSIONS (Extended)
-- ============================================================================
ALTER TABLE auto_trading_sessions 
  ADD COLUMN IF NOT EXISTS win_rate DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS total_trades INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS winning_trades INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS losing_trades INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_pnl_nok DECIMAL(20,8) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_drawdown_pct DECIMAL(5,2);
-- ============================================================================
-- 5. USER PROFILES (Add missing columns)
-- ============================================================================
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT;
