-- ===========================================
-- Auto-trade state persistence
-- Sørger for at ALT huskes mellom sessions
-- ===========================================

-- bot_configs: Lagrer alle bot-innstillinger
CREATE TABLE IF NOT EXISTS bot_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bot_name TEXT NOT NULL DEFAULT 'Min Bot',
  strategy_type TEXT NOT NULL DEFAULT 'dca',
  is_active BOOLEAN DEFAULT false,
  is_paper_trade BOOLEAN DEFAULT true,
  -- DCA-parametere
  dca_interval_minutes INTEGER DEFAULT 60,
  dca_amount_nok DECIMAL(12,2) DEFAULT 500,
  -- Risk management
  stop_loss_percent DECIMAL(5,2) DEFAULT 5.0,
  take_profit_percent DECIMAL(5,2) DEFAULT 15.0,
  max_position_size_percent DECIMAL(5,2) DEFAULT 10.0,
  -- AI adaptive
  ai_adaptive_enabled BOOLEAN DEFAULT true,
  last_ai_adjustment_at TIMESTAMPTZ,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Indeks for raske oppslag
CREATE INDEX IF NOT EXISTS bot_configs_user_id_idx ON bot_configs(user_id);
CREATE INDEX IF NOT EXISTS bot_configs_is_active_idx ON bot_configs(is_active) WHERE is_active = true;
-- auto_trade_log: Full historikk av alle automatiske handlinger
CREATE TABLE IF NOT EXISTS auto_trade_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bot_config_id UUID REFERENCES bot_configs(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'buy', 'sell', 'hold', 'stopped', 'started'
  symbol TEXT NOT NULL DEFAULT 'BTC',
  amount_nok DECIMAL(12,2),
  price_at_action DECIMAL(18,8),
  reason TEXT, -- AI-begrunnelse
  sentiment_score INTEGER, -- Fear & Greed (0-100)
  is_paper BOOLEAN DEFAULT true,
  exchange_order_id TEXT, -- Binance order ID
  status TEXT DEFAULT 'pending', -- 'pending', 'executed', 'failed'
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS auto_trade_log_user_id_idx ON auto_trade_log(user_id);
CREATE INDEX IF NOT EXISTS auto_trade_log_executed_at_idx ON auto_trade_log(executed_at DESC);
-- RLS
ALTER TABLE bot_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_trade_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own bot_configs" ON bot_configs FOR ALL 
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users see own auto_trade_log" ON auto_trade_log FOR ALL 
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- Trigger: auto-oppdater updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language 'plpgsql';
DROP TRIGGER IF EXISTS update_bot_configs_updated_at ON bot_configs;
CREATE TRIGGER update_bot_configs_updated_at
  BEFORE UPDATE ON bot_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
