-- Migration: AI Auto-Trading Support
-- Date: 2026-02-17
-- Description: Adds AI-specific columns and logging for free AI auto-trading

-- Add AI-specific columns to paper_trades
ALTER TABLE paper_trades
ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(4,3),  -- 0.000-1.000
ADD COLUMN IF NOT EXISTS ai_reason TEXT,
ADD COLUMN IF NOT EXISTS sentiment_score DECIMAL(4,3), -- -1.000 to 1.000
ADD COLUMN IF NOT EXISTS fear_greed_index INTEGER,
ADD COLUMN IF NOT EXISTS rsi DECIMAL(5,2);

-- Create table for AI analysis logs
CREATE TABLE IF NOT EXISTS ai_analysis_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  prediction_action TEXT NOT NULL CHECK (prediction_action IN ('BUY', 'SELL', 'HOLD')),
  prediction_confidence DECIMAL(4,3) NOT NULL,
  sentiment_score DECIMAL(4,3) NOT NULL,
  fear_greed_index INTEGER,
  rsi DECIMAL(5,2),
  target_price DECIMAL(20,8),
  stop_loss DECIMAL(20,8),
  reason TEXT,
  executed BOOLEAN DEFAULT false,
  trade_id UUID REFERENCES paper_trades(id),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_ai_logs_user_id ON ai_analysis_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_symbol ON ai_analysis_logs(symbol);
CREATE INDEX IF NOT EXISTS idx_ai_logs_timestamp ON ai_analysis_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_user_timestamp ON ai_analysis_logs(user_id, timestamp DESC);

-- Enable RLS
ALTER TABLE ai_analysis_logs ENABLE ROW LEVEL SECURITY;

-- Users can only view their own AI logs
DROP POLICY IF EXISTS "Users can view own AI logs" ON ai_analysis_logs;
CREATE POLICY "Users can view own AI logs"
  ON ai_analysis_logs FOR SELECT
  USING (user_id = auth.uid());

-- Users can only insert their own AI logs
DROP POLICY IF EXISTS "Users can insert own AI logs" ON ai_analysis_logs;
CREATE POLICY "Users can insert own AI logs"
  ON ai_analysis_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can only update their own AI logs
DROP POLICY IF EXISTS "Users can update own AI logs" ON ai_analysis_logs;
CREATE POLICY "Users can update own AI logs"
  ON ai_analysis_logs FOR UPDATE
  USING (user_id = auth.uid());

-- Comments
COMMENT ON TABLE ai_analysis_logs IS 'AI auto-trading analysis logs using free Cloudflare Workers AI';
COMMENT ON COLUMN ai_analysis_logs.prediction_action IS 'AI predicted action: BUY, SELL, or HOLD';
COMMENT ON COLUMN ai_analysis_logs.prediction_confidence IS 'AI confidence score 0.0-1.0';
COMMENT ON COLUMN ai_analysis_logs.sentiment_score IS 'Aggregated sentiment score -1.0 to 1.0';
COMMENT ON COLUMN ai_analysis_logs.fear_greed_index IS 'Market fear & greed index 0-100';

-- Function to get AI trading stats for user
CREATE OR REPLACE FUNCTION get_ai_trading_stats(p_user_id UUID)
RETURNS TABLE (
  total_analyses BIGINT,
  buy_signals BIGINT,
  sell_signals BIGINT,
  hold_signals BIGINT,
  avg_confidence DECIMAL(4,3),
  executed_trades BIGINT,
  last_analysis_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_analyses,
    COUNT(*) FILTER (WHERE prediction_action = 'BUY')::BIGINT as buy_signals,
    COUNT(*) FILTER (WHERE prediction_action = 'SELL')::BIGINT as sell_signals,
    COUNT(*) FILTER (WHERE prediction_action = 'HOLD')::BIGINT as hold_signals,
    COALESCE(AVG(prediction_confidence), 0)::DECIMAL(4,3) as avg_confidence,
    COUNT(*) FILTER (WHERE executed = true)::BIGINT as executed_trades,
    MAX(timestamp) as last_analysis_at
  FROM ai_analysis_logs
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to clean old AI logs (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_ai_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ai_analysis_logs
  WHERE timestamp < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
