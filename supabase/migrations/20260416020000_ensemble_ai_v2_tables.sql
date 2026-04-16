-- Migration: Ensemble AI v2 - Multi-agent, feature store, feedback loop, cron monitoring

-- ============================================================
-- 1) Extend trading_signals for multi-agent ensemble
-- ============================================================
ALTER TABLE public.trading_signals
    ADD COLUMN IF NOT EXISTS ensemble_run_id UUID,
    ADD COLUMN IF NOT EXISTS agent_id TEXT,
    ADD COLUMN IF NOT EXISTS agent_weight REAL,
    ADD COLUMN IF NOT EXISTS model_version TEXT,
    ADD COLUMN IF NOT EXISTS feature_version TEXT,
    ADD COLUMN IF NOT EXISTS agent_meta JSONB;

CREATE INDEX IF NOT EXISTS idx_trading_signals_ensemble_run
    ON public.trading_signals (ensemble_run_id)
    WHERE ensemble_run_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trading_signals_agent
    ON public.trading_signals (agent_id)
    WHERE agent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trading_signals_signal_type_agent
    ON public.trading_signals (signal_type, agent_id, created_at DESC);

-- ============================================================
-- 2) Feature store (foundation)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_feature_store (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL,
    timeframe TEXT NOT NULL DEFAULT '1h',
    as_of TIMESTAMPTZ NOT NULL DEFAULT now(),
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    source TEXT,
    checksum TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_feature_store_lookup
    ON public.ai_feature_store (symbol, timeframe, as_of DESC);

CREATE INDEX IF NOT EXISTS idx_ai_feature_store_created
    ON public.ai_feature_store (created_at DESC);

COMMENT ON TABLE public.ai_feature_store IS 'Cached feature vectors for AI agents per symbol/timeframe';

-- ============================================================
-- 3) Signal outcomes (feedback loop)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_signal_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_id UUID,
    trade_id UUID,
    pnl NUMERIC(18,8),
    r_multiple NUMERIC(18,4),
    holding_time_seconds INTEGER,
    sl_hit BOOLEAN DEFAULT false,
    tp_hit BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_signal_outcomes_signal
    ON public.ai_signal_outcomes (signal_id)
    WHERE signal_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_signal_outcomes_trade
    ON public.ai_signal_outcomes (trade_id)
    WHERE trade_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_signal_outcomes_created
    ON public.ai_signal_outcomes (created_at DESC);

-- ============================================================
-- 4) Agent stats (rolling performance)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_agent_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    timeframe TEXT NOT NULL DEFAULT '1h',
    trades_count INTEGER NOT NULL DEFAULT 0,
    win_rate NUMERIC(6,4),
    avg_r_multiple NUMERIC(18,4),
    max_drawdown NUMERIC(18,4),
    sharpe_like_score NUMERIC(18,4),
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (agent_id, symbol, timeframe)
);

CREATE INDEX IF NOT EXISTS idx_ai_agent_stats_lookup
    ON public.ai_agent_stats (agent_id, symbol, timeframe);

CREATE INDEX IF NOT EXISTS idx_ai_agent_stats_updated
    ON public.ai_agent_stats (last_updated_at DESC);

-- ============================================================
-- 5) Cron job runs (monitoring)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cron_job_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    error_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cron_job_runs_name_created
    ON public.cron_job_runs (job_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cron_job_runs_status
    ON public.cron_job_runs (status, created_at DESC);
