-- price_candles: 1h OHLCV for backtest-pipeline
-- Kilde: Binance via binance-proxy (geo-blocked → proxy)
-- Oppdateres daglig av cron (scripts/fetch-klines.mjs)

CREATE TABLE IF NOT EXISTS price_candles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol text NOT NULL,
  open_time timestamptz NOT NULL,
  open numeric NOT NULL,
  high numeric NOT NULL,
  low numeric NOT NULL,
  close numeric NOT NULL,
  volume numeric NOT NULL,
  close_time timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(symbol, open_time)
);

CREATE INDEX IF NOT EXISTS idx_price_candles_symbol_time ON price_candles(symbol, open_time DESC);
CREATE INDEX IF NOT EXISTS idx_price_candles_time ON price_candles(open_time DESC);

-- RLS: kun service_role (backtest-pipeline), ingen klient-tilgang
ALTER TABLE price_candles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON price_candles
  FOR ALL TO service_role USING (true) WITH CHECK (true);
