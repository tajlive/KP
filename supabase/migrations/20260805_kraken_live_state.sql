-- Kraken live state — synkronisert balanse/ordre for brukere med Kraken-nøkler
-- Skrives av /api/cron/kraken-balance-sync (hvert 5. min), leses av dashboard-UI
CREATE TABLE IF NOT EXISTS kraken_live_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_usdc NUMERIC NOT NULL DEFAULT 0,
  open_orders INT NOT NULL DEFAULT 0,
  open_buy_orders INT NOT NULL DEFAULT 0,
  open_sell_orders INT NOT NULL DEFAULT 0,
  realized_profit_usdc NUMERIC NOT NULL DEFAULT 0,
  base_holdings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE kraken_live_state ENABLE ROW LEVEL SECURITY;

-- Brukeren leser kun egen state (UI)
CREATE POLICY "Users read own kraken live state"
  ON kraken_live_state FOR SELECT
  USING (auth.uid() = user_id);

-- Service role skriver og leser alt (sync-cron)
CREATE POLICY "Service role full access kraken live state"
  ON kraken_live_state FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_kraken_live_state_updated
  ON kraken_live_state(updated_at DESC);

-- Grid-state referanse for grid-manager-synk (valgfri; manager kjører lokalt)
CREATE TABLE IF NOT EXISTS kraken_grid_levels (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pair TEXT NOT NULL,
  level INT NOT NULL,
  buy_price NUMERIC NOT NULL,
  sell_price NUMERIC,
  volume TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'empty',  -- empty | bought | sold
  order_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, pair, level)
);

ALTER TABLE kraken_grid_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own kraken grid levels"
  ON kraken_grid_levels FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Service role full access kraken grid levels"
  ON kraken_grid_levels FOR ALL
  USING (auth.role() = 'service_role');
