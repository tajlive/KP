-- Migration: Add auto_trading_trades table for automated trading execution
-- Created: 2026-03-28

CREATE TABLE IF NOT EXISTS auto_trading_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('BUY','SELL')),
  quantity NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','open','closed','failed')),
  binance_order_id TEXT,
  idempotency_key TEXT UNIQUE NOT NULL,
  strategy_id UUID,
  fee NUMERIC,
  pnl NUMERIC,
  error_message TEXT,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE auto_trading_trades ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own trades
CREATE POLICY "Users see own trades" ON auto_trading_trades
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_auto_trading_trades_user_id ON auto_trading_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_trading_trades_status ON auto_trading_trades(status);
CREATE INDEX IF NOT EXISTS idx_auto_trading_trades_created_at ON auto_trading_trades(created_at);
