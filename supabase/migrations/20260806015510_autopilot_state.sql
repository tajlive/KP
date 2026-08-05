-- Autopilot state — per-bruker autopilot-tilstand (grid-nivåer, equity, realized profit, last_run, activated)
-- Én rad per bruker. Skrives av autopilot-orchestrator-cron (service_role), leses av dashboard-UI (egen rad).
CREATE TABLE IF NOT EXISTS autopilot_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  activated BOOLEAN NOT NULL DEFAULT false,
  initial_equity_usdc NUMERIC(18,8) NOT NULL DEFAULT 0,
  current_equity_usdc NUMERIC(18,8) NOT NULL DEFAULT 0,
  realized_profit_usdc NUMERIC(18,8) NOT NULL DEFAULT 0,
  grid_levels JSONB NOT NULL DEFAULT '[]'::jsonb,
  drawdown_kill BOOLEAN NOT NULL DEFAULT false,
  five_pair_activated BOOLEAN NOT NULL DEFAULT false,
  last_run TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE autopilot_state ENABLE ROW LEVEL SECURITY;

-- Brukeren leser kun egen autopilot-state (dashboard-UI)
CREATE POLICY "Users can read own autopilot state"
  ON autopilot_state FOR SELECT
  USING (auth.uid() = user_id);

-- Service role leser og skriver alt (orchestrator-cron, deposit-webhook)
CREATE POLICY "Service role full access autopilot state"
  ON autopilot_state FOR ALL
  USING (auth.role() = 'service_role');
