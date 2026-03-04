-- Sprint 11: Strategy Runner tabeller og pg_cron-schedules
-- Oppretter strategy_logs og nok_exchange_rates (idempotent)

-- ── strategy_logs: kjøringslogg for strategy-runner ─────────────────────────
CREATE TABLE IF NOT EXISTS public.strategy_logs (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  strategy_type TEXT      NOT NULL,
  status      TEXT        NOT NULL CHECK (status IN ('success', 'error', 'skipped')),
  details     JSONB,
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strategy_logs_user_time
  ON public.strategy_logs (user_id, executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_strategy_logs_type_status
  ON public.strategy_logs (strategy_type, status, executed_at DESC);

ALTER TABLE public.strategy_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'strategy_logs' AND policyname = 'users_own_strategy_logs'
  ) THEN
    CREATE POLICY users_own_strategy_logs ON public.strategy_logs
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Service role full access
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'strategy_logs' AND policyname = 'service_role_strategy_logs'
  ) THEN
    CREATE POLICY service_role_strategy_logs ON public.strategy_logs
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── nok_exchange_rates: cache for Norges Bank-kurs ──────────────────────────
CREATE TABLE IF NOT EXISTS public.nok_exchange_rates (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  pair       TEXT        NOT NULL DEFAULT 'USD/NOK',
  rate       NUMERIC     NOT NULL,
  source     TEXT        NOT NULL DEFAULT 'norgesbank',
  fetched_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nok_rates_pair_time
  ON public.nok_exchange_rates (pair, fetched_at DESC);

ALTER TABLE public.nok_exchange_rates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'nok_exchange_rates' AND policyname = 'service_role_nok_rates'
  ) THEN
    CREATE POLICY service_role_nok_rates ON public.nok_exchange_rates
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'nok_exchange_rates' AND policyname = 'authenticated_read_nok_rates'
  ) THEN
    CREATE POLICY authenticated_read_nok_rates ON public.nok_exchange_rates
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
