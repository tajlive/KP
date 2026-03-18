-- Migration: AI Decision Log Table - AI MVP Seksjon 6
-- Logger alle AI-beslutninger for observability og debugging

CREATE TABLE IF NOT EXISTS ai_decision_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    strategy_id TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Sentiment data
    sentiment_value INTEGER NOT NULL,
    sentiment_classification TEXT NOT NULL,
    sentiment_recommendation TEXT NOT NULL,
    sentiment_confidence DECIMAL(3,2) NOT NULL,
    sentiment_reasoning TEXT,
    
    -- Performance metrics
    performance_total_return DECIMAL(10,2),
    performance_win_rate DECIMAL(5,2),
    performance_drawdown DECIMAL(10,2),
    performance_sharpe_ratio DECIMAL(5,2),
    performance_volatility DECIMAL(10,2),
    performance_last_7_days DECIMAL(10,2),
    performance_last_30_days DECIMAL(10,2),
    
    -- Adjustments made
    adjustments JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Explanation for users
    explanation TEXT NOT NULL,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_ai_decision_user_id ON ai_decision_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_decision_strategy_id ON ai_decision_log(strategy_id);
CREATE INDEX IF NOT EXISTS idx_ai_decision_timestamp ON ai_decision_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_decision_created_at ON ai_decision_log(created_at DESC);
-- Row Level Security (RLS)
ALTER TABLE ai_decision_log ENABLE ROW LEVEL SECURITY;
-- Policy: Users can only see their own AI decisions
CREATE POLICY "Users can view own AI decisions"
    ON ai_decision_log FOR SELECT
    USING (auth.uid() = user_id);
-- Policy: System can insert AI decisions
CREATE POLICY "System can insert AI decisions"
    ON ai_decision_log FOR INSERT
    WITH CHECK (true);
-- Comments for documentation
COMMENT ON TABLE ai_decision_log IS 'Logs all AI-driven strategy adjustments for observability and user transparency';
COMMENT ON COLUMN ai_decision_log.sentiment_value IS 'Fear & Greed Index value (0-100)';
COMMENT ON COLUMN ai_decision_log.sentiment_classification IS 'extreme_fear, fear, neutral, greed, extreme_greed';
COMMENT ON COLUMN ai_decision_log.adjustments IS 'JSON array of parameter adjustments made';
COMMENT ON COLUMN ai_decision_log.explanation IS 'Human-readable explanation of why adjustments were made';
