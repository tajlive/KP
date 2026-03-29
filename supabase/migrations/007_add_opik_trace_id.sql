-- Migration: Add Opik trace ID to ai_decision_log
-- For å kunne koble AI-beslutninger til Opik traces

-- Legg til opik_trace_id kolonne
ALTER TABLE ai_decision_log
ADD COLUMN IF NOT EXISTS opik_trace_id TEXT;

-- Index for effektiv lookup på trace_id
CREATE INDEX IF NOT EXISTS idx_ai_decision_opik_trace_id 
ON ai_decision_log(opik_trace_id) 
WHERE opik_trace_id IS NOT NULL;

-- Kommentar for dokumentasjon
COMMENT ON COLUMN ai_decision_log.opik_trace_id IS 'Opik trace ID for observability og debugging av AI-kall';
