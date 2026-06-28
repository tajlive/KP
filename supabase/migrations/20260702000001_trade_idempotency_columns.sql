-- Reconcile idempotency columns/indexes on public.trades.
-- Earlier migrations created `idempotency_key TEXT NOT NULL` and a single-column
-- unique index on (idempotency_key). This migration makes the key nullable,
-- introduces the scope column with a NOT NULL default, and replaces the index
-- with the intended composite partial unique index on (scope, key).

-- 1. Make idempotency_key nullable so the partial unique index can exclude NULLs.
ALTER TABLE public.trades
  ALTER COLUMN idempotency_key DROP NOT NULL;

-- 2. Ensure idempotency_scope exists and is NOT NULL with default 'trade'.
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS idempotency_scope TEXT NOT NULL DEFAULT 'trade';
ALTER TABLE public.trades
  ALTER COLUMN idempotency_scope SET DEFAULT 'trade',
  ALTER COLUMN idempotency_scope SET NOT NULL;

-- 3. Replace the old single-column unique index with the composite partial one.
DROP INDEX IF EXISTS public.idx_trades_idempotency;
CREATE UNIQUE INDEX IF NOT EXISTS idx_trades_idempotency
  ON public.trades (idempotency_scope, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Add idempotency columns to ai_decision_log (no pre-existing objects expected).
ALTER TABLE public.ai_decision_log
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_scope TEXT NOT NULL DEFAULT 'signal';
ALTER TABLE public.ai_decision_log
  ALTER COLUMN idempotency_scope SET DEFAULT 'signal',
  ALTER COLUMN idempotency_scope SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_decision_log_idempotency
  ON public.ai_decision_log (idempotency_scope, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
