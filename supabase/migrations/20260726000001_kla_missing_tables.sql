-- KLA-rydding 2026-07-25: Migrasjoner for 4 kritiske tabeller som finnes i
-- prod men mangler CREATE i repo (opprettet manuelt). Gjør databasen
-- reproduserbar fra kanoniske migrasjoner.
--
-- Skjema hentet 1:1 fra prod (information_schema + pg_policies + pg_indexes
-- + pg_constraint) 2026-07-25. Tabellene FINNES allerede i prod → alt er
-- idempotent: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS,
-- DROP POLICY IF EXISTS før CREATE POLICY.
--
-- MERK: Ved eksisterende tabell hoppes hele CREATE TABLE over (inkl. FK) —
-- det er tilstrekkelig siden prod allerede har riktig skjema. Migrasjonen
-- garanterer reproduksjon på FRESH database (nytt dev-miljø / branch).

-- ═══ 1. user_klt_balances (KLT-lommebok, autoritativ etter r4-konsolidering)
CREATE TABLE IF NOT EXISTS public.user_klt_balances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  balance integer NOT NULL DEFAULT 0,
  total_earned integer NOT NULL DEFAULT 0,
  total_spent integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT user_klt_balances_pkey PRIMARY KEY (id),
  CONSTRAINT user_klt_balances_user_id_key UNIQUE (user_id),
  CONSTRAINT user_klt_balances_balance_check CHECK (balance >= 0),
  CONSTRAINT user_klt_balances_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_klt_balances_user_id
  ON public.user_klt_balances USING btree (user_id);

ALTER TABLE public.user_klt_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own balance" ON public.user_klt_balances;
CREATE POLICY "Users can view own balance" ON public.user_klt_balances
  FOR SELECT USING (auth.uid() = user_id);

-- ═══ 2. klt_transactions (KLT-transaksjonslogg)
CREATE TABLE IF NOT EXISTS public.klt_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  type varchar NOT NULL,
  category varchar NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  reason text,
  CONSTRAINT klt_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT klt_transactions_type_check
    CHECK (type::text = ANY (ARRAY['reward'::varchar, 'spend'::varchar, 'bonus'::varchar, 'founder'::varchar]::text[])),
  CONSTRAINT klt_transactions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_klt_transactions_user_id
  ON public.klt_transactions USING btree (user_id, created_at DESC);

ALTER TABLE public.klt_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON public.klt_transactions;
CREATE POLICY "Users can view own transactions" ON public.klt_transactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service can insert transactions" ON public.klt_transactions;
CREATE POLICY "Service can insert transactions" ON public.klt_transactions
  FOR INSERT WITH CHECK (true);

-- ═══ 3. trading_logs (cron/tick, autopilot, guardrails)
CREATE TABLE IF NOT EXISTS public.trading_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  trade_id uuid,
  action text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now(),
  user_id uuid,
  CONSTRAINT trading_logs_pkey PRIMARY KEY (id),
  CONSTRAINT trading_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trading_logs_user_id
  ON public.trading_logs USING btree (user_id);

ALTER TABLE public.trading_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trading_logs_select_own" ON public.trading_logs;
CREATE POLICY "trading_logs_select_own" ON public.trading_logs
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "trading_logs_insert_own" ON public.trading_logs;
CREATE POLICY "trading_logs_insert_own" ON public.trading_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ═══ 4. ai_cache (/api/ai/insight, /api/ai/market-brief)
CREATE TABLE IF NOT EXISTS public.ai_cache (
  cache_key text NOT NULL,
  value jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT ai_cache_pkey PRIMARY KEY (cache_key)
);

ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_cache_service_role" ON public.ai_cache;
CREATE POLICY "ai_cache_service_role" ON public.ai_cache
  FOR ALL USING (public.is_service_role());
