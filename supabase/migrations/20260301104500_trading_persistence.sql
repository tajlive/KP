-- Sikre at trades-tabellen har alle nødvendige kolonner
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'paper',
ADD COLUMN IF NOT EXISTS trading_pair TEXT,
ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'market',
ADD COLUMN IF NOT EXISTS fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS strategy_signal JSONB,
ADD COLUMN IF NOT EXISTS binance_order_id TEXT,
ADD COLUMN IF NOT EXISTS executed_at TIMESTAMPTZ DEFAULT NOW();

-- Sikre at trading_sessions har balance-kolonnen (standardisert til _nok)
ALTER TABLE trading_sessions
ADD COLUMN IF NOT EXISTS current_capital_nok NUMERIC DEFAULT 10000,
ADD COLUMN IF NOT EXISTS starting_capital_nok NUMERIC DEFAULT 10000,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Indekser for ytelse
CREATE INDEX IF NOT EXISTS idx_trades_session_id ON trades(session_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_mode ON trades(mode);
CREATE INDEX IF NOT EXISTS idx_trading_sessions_user_id ON trading_sessions(user_id);

-- Row Level Security
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own trades" ON trades;
CREATE POLICY "Users can manage own trades" ON trades
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE trading_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own sessions" ON trading_sessions;
CREATE POLICY "Users can manage own sessions" ON trading_sessions
  FOR ALL USING (auth.uid() = user_id);
