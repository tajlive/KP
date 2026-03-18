-- Coin prices table for live price tracking
CREATE TABLE IF NOT EXISTS coin_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price DECIMAL(24,8) NOT NULL DEFAULT 0,
  price_change_24h DECIMAL(24,8),
  price_change_percent_24h DECIMAL(10,4),
  volume_24h DECIMAL(24,8),
  market_cap DECIMAL(24,2),
  high_24h DECIMAL(24,8),
  low_24h DECIMAL(24,8),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coin_prices_symbol ON coin_prices(symbol);
CREATE INDEX IF NOT EXISTS idx_coin_prices_updated ON coin_prices(last_updated DESC);
-- Enable realtime for live price updates
ALTER PUBLICATION supabase_realtime ADD TABLE coin_prices;
-- Seed initial symbols
INSERT INTO coin_prices (symbol, name, price) VALUES
  ('BTCUSDT', 'BTC', 0),
  ('ETHUSDT', 'ETH', 0),
  ('BNBUSDT', 'BNB', 0),
  ('SOLUSDT', 'SOL', 0),
  ('XRPUSDT', 'XRP', 0),
  ('ADAUSDT', 'ADA', 0),
  ('DOGEUSDT', 'DOGE', 0),
  ('AVAXUSDT', 'AVAX', 0),
  ('DOTUSDT', 'DOT', 0),
  ('MATICUSDT', 'MATIC', 0)
ON CONFLICT (symbol) DO NOTHING;
