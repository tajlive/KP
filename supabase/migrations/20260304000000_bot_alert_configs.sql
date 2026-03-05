/*
-- Phase 2: Bot alert configurations table
CREATE TABLE IF NOT EXISTS bot_alert_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id UUID NOT NULL,
  drawdown_threshold_pct DECIMAL DEFAULT 10,
  daily_loss_limit_nok DECIMAL,
  notify_on_trade BOOLEAN DEFAULT true,
  notify_on_error BOOLEAN DEFAULT true,
  notification_channels TEXT[] DEFAULT '{push}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(strategy_id)
);

-- RLS
ALTER TABLE bot_alert_configs ENABLE ROW LEVEL SECURITY;

-- Users can only see/modify their own alert configs
CREATE POLICY "Users can view own alert configs"
  ON bot_alert_configs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alert configs"
  ON bot_alert_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alert configs"
  ON bot_alert_configs FOR UPDATE
  USING (auth.uid() = user_id);
*/
