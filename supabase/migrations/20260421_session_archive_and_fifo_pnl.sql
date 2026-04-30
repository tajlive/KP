-- legacy-accepted: 8-sifret timestamp, deployet til prod 2026-04. Se AGENTS.md.
-- Migration: Session archiving + realized_pnl for paper trades
-- Date: 2026-04-21
-- Approach: Use session.open_position for single-position P&L calc at sell time

-- ═══════════════════════════════════════════════════════════
-- 1. Add archived flag to trading_sessions
-- ═══════════════════════════════════════════════════════════

ALTER TABLE trading_sessions
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Partial index for fast "active dashboard" queries
CREATE INDEX IF NOT EXISTS idx_trading_sessions_active
ON trading_sessions(user_id, status, archived)
WHERE archived = FALSE;

-- ═══════════════════════════════════════════════════════════
-- 2. Archive old stopped/crashed sessions (> 7 days)
-- ═══════════════════════════════════════════════════════════

UPDATE trading_sessions
SET archived = TRUE, archived_at = NOW()
WHERE status IN ('stopped', 'crashed')
  AND archived = FALSE
  AND updated_at < NOW() - INTERVAL '7 days';

-- ═══════════════════════════════════════════════════════════
-- 3. Auto-archive cron job (runs nightly at 03:00)
-- ═══════════════════════════════════════════════════════════

SELECT cron.schedule(
  'klarpakke-auto-archive-sessions',
  '0 3 * * *',
  $$
    UPDATE trading_sessions
    SET archived = TRUE, archived_at = NOW()
    WHERE status IN ('stopped', 'crashed')
      AND archived = FALSE
      AND updated_at < NOW() - INTERVAL '7 days';
  $$
);
