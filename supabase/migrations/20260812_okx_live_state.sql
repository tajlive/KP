-- OKX live state — synkronisert balanse/ordre for brukere med OKX-nøkler
-- KLA-300 (2026-08-12): OKX-saldo manglet DB-persistens — hver dashboard-last
-- gjorde live API-kall uten historikk eller fallback.
-- Skrives av /api/cron/okx-balance-sync (hvert 5. min), leses av dashboard-UI.
-- Valuta: USDC (OKX EU er USDC-denominert).
CREATE TABLE IF NOT EXISTS okx_live_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_usdc NUMERIC NOT NULL DEFAULT 0,
  total_nok NUMERIC NOT NULL DEFAULT 0,
  open_orders INT NOT NULL DEFAULT 0,
  open_buy_orders INT NOT NULL DEFAULT 0,
  open_sell_orders INT NOT NULL DEFAULT 0,
  realized_profit_usdc NUMERIC NOT NULL DEFAULT 0,
  daily_pnl_usdc NUMERIC NOT NULL DEFAULT 0,
  daily_pnl_pct NUMERIC NOT NULL DEFAULT 0,
  base_holdings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE okx_live_state ENABLE ROW LEVEL SECURITY;

-- Brukeren leser kun egen state (UI)
CREATE POLICY "Users read own okx live state"
  ON okx_live_state FOR SELECT
  USING (auth.uid() = user_id);

-- Service role skriver og leser alt (sync-cron)
CREATE POLICY "Service role full access okx live state"
  ON okx_live_state FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_okx_live_state_updated
  ON okx_live_state(updated_at DESC);
