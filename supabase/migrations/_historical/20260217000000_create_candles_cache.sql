-- ============================================
-- BINANCE HISTORICAL CANDLES CACHE
-- ============================================

CREATE TABLE IF NOT EXISTS binance_historical_candles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(20) NOT NULL,
  interval VARCHAR(5) NOT NULL,
  
  -- Candle data
  open_time TIMESTAMPTZ NOT NULL,
  close_time TIMESTAMPTZ NOT NULL,
  open DECIMAL(20, 8) NOT NULL,
  high DECIMAL(20, 8) NOT NULL,
  low DECIMAL(20, 8) NOT NULL,
  close DECIMAL(20, 8) NOT NULL,
  volume DECIMAL(20, 8) NOT NULL,
  number_of_trades INTEGER,
  quote_volume DECIMAL(20, 8),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE(symbol, interval, open_time)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_candles_symbol_interval 
  ON binance_historical_candles(symbol, interval);

CREATE INDEX IF NOT EXISTS idx_candles_time_range 
  ON binance_historical_candles(symbol, interval, open_time, close_time);

-- Partial index for recent data (most accessed)
CREATE INDEX IF NOT EXISTS idx_candles_recent 
  ON binance_historical_candles(symbol, interval, open_time)
  WHERE open_time > NOW() - INTERVAL '90 days';

-- Enable RLS but allow public read (market data is public)
ALTER TABLE binance_historical_candles ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read cached data
DROP POLICY IF EXISTS "Public can read candles" ON binance_historical_candles;
CREATE POLICY "Public can read candles" 
  ON binance_historical_candles FOR SELECT 
  USING (true);

-- Only service role can insert/update
DROP POLICY IF EXISTS "Service role can manage candles" ON binance_historical_candles;
CREATE POLICY "Service role can manage candles" 
  ON binance_historical_candles FOR ALL 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_candles_updated_at ON binance_historical_candles;
CREATE TRIGGER update_candles_updated_at
  BEFORE UPDATE ON binance_historical_candles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE binance_historical_candles IS 'Cached historical candle data from Binance API for backtesting';
