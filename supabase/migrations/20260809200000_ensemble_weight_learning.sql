-- Task 5: Meta-læring av ensemble-vekter fra faktisk P&L
-- Lagrer vekter per komponent (TA, AI, Regime) slik at de kan oppdateres
-- basert på hvilken komponent som faktisk tjente penger.

CREATE TABLE IF NOT EXISTS ensemble_component_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component text NOT NULL UNIQUE, -- 'ta', 'ai', 'regime'
  weight numeric NOT NULL CHECK (weight >= 0 AND weight <= 1),
  ema_pnl numeric NOT NULL DEFAULT 0, -- exponential moving average av attributt-P&L
  trade_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Hardkodede defaults (dagens verdier fra ensemble-engine.ts linje 266)
INSERT INTO ensemble_component_weights (component, weight, ema_pnl, trade_count)
VALUES
  ('ta', 0.40, 0, 0),
  ('ai', 0.40, 0, 0),
  ('regime', 0.20, 0, 0)
ON CONFLICT (component) DO NOTHING;

-- Attributt-tabell: hvilken komponent bidro mest til hver handel?
-- (brukes av weight-learner cron for å beregne P&L per komponent)
CREATE TABLE IF NOT EXISTS ensemble_trade_attribution (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  symbol text NOT NULL,
  ta_score numeric NOT NULL,
  ai_score numeric NOT NULL,
  regime_score numeric NOT NULL,
  final_score numeric NOT NULL,
  action text NOT NULL, -- BUY/SELL/HOLD
  realized_pnl numeric, -- NULL til posisjonen lukkes
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attribution_trade ON ensemble_trade_attribution(trade_id);
CREATE INDEX IF NOT EXISTS idx_attribution_user ON ensemble_trade_attribution(user_id);
CREATE INDEX IF NOT EXISTS idx_attribution_pnl ON ensemble_trade_attribution(realized_pnl) WHERE realized_pnl IS NOT NULL;

-- RLS: service-role skriver, brukere leser egne
ALTER TABLE ensemble_component_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ensemble_trade_attribution ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON ensemble_component_weights
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all" ON ensemble_trade_attribution
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "users_read_own_attribution" ON ensemble_trade_attribution
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
