-- KLA-rydding 2026-07-25, del 2: Gjenstaaende 8 tabeller fra DB-kartleggingen.
--
-- Seksjon A: 2 tabeller som FINNES i prod uten CREATE i repo
--   (unified_trading_sessions: 1010 rader, klt_spending_options: 6 rader).
--   Skjema hentet 1:1 fra prod. Seed kun for klt_spending_options
--   (konfig-data). unified_trading_sessions seedes IKKE (brukerdata).
-- Seksjon B: 6 tabeller som IKKE finnes i prod (stille doede kall).
--   Skjema designet fra verifisert kodebruk i src/ (kolonner brukt i
--   select/insert/upsert). Alt idempotent.
--
-- Godkjent av Tom 2026-07-25 (trinn 3-beslutninger).

-- ═══════════════════════════════════════════════════════════════════
-- SEKSJON A — Finnes i prod, gjenskapes 1:1
-- ═══════════════════════════════════════════════════════════════════

-- A1. unified_trading_sessions (1010 rader i prod, brukt av bot-store)
-- Prod har BEVISST ingen PK/indekser/RLS — gjenskapes eksakt som den er.
CREATE TABLE IF NOT EXISTS public.unified_trading_sessions (
  id uuid,
  user_id uuid,
  mode text,
  status text,
  strategy text,
  config jsonb,
  symbol text,
  current_capital numeric,
  current_capital_nok numeric,
  initial_capital numeric,
  starting_capital_nok numeric,
  total_pnl numeric,
  total_pnl_pct numeric,
  total_trades integer,
  winning_trades integer,
  losing_trades integer,
  win_rate numeric,
  max_drawdown_pct numeric,
  open_position jsonb,
  last_heartbeat timestamptz,
  last_trade_at timestamptz,
  started_at timestamptz,
  stopped_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  copy_of_session_id uuid,
  currency text,
  daily_loss_limit_pct numeric,
  stop_loss_pct numeric,
  take_profit_pct numeric,
  max_position_pct numeric,
  is_public boolean,
  followers_count integer
);

-- A2. klt_spending_options (6 konfig-rader i prod, brukt av KltWidget)
CREATE TABLE IF NOT EXISTS public.klt_spending_options (
  id text NOT NULL,
  name_no text NOT NULL,
  name_en text NOT NULL,
  description_no text,
  description_en text,
  cost_klt integer NOT NULL,
  duration_hours integer,
  max_uses integer,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT klt_spending_options_pkey PRIMARY KEY (id)
);

ALTER TABLE public.klt_spending_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Alle kan se spending options" ON public.klt_spending_options;
CREATE POLICY "Alle kan se spending options" ON public.klt_spending_options
  FOR SELECT USING (true);

-- Seed: 6 konfig-rader fra prod (idempotent)
INSERT INTO public.klt_spending_options
  (id, name_no, name_en, description_no, description_en, cost_klt, duration_hours, max_uses, is_active, sort_order)
VALUES
  ('jokertrade', '🎰 JokerTrade AI-trade', '🎰 JokerTrade AI Trade',
   'AI-en finner og utfører én trade for deg', 'AI finds and executes one trade for you',
   50, NULL, NULL, true, 1),
  ('live_1day', '🚀 Live trading (1 dag)', '🚀 Live Trading (1 day)',
   'Handle med ekte penger i 24 timer', 'Trade with real money for 24 hours',
   200, 24, NULL, true, 2),
  ('live_1week', '🚀 Live trading (1 uke)', '🚀 Live Trading (1 week)',
   'Handle med ekte penger i 7 dager', 'Trade with real money for 7 days',
   800, 168, NULL, true, 3),
  ('analytics', '📊 Avansert analyse', '📊 Advanced Analytics',
   'Dypdykk i trading-mønstre og innsikt', 'Deep dive into trading patterns and insights',
   150, 24, NULL, true, 4),
  ('course_unlock', '🎓 Lås opp premium-kurs', '🎓 Unlock Premium Course',
   'Få tilgang til et premium trading-kurs', 'Access a premium trading course',
   1000, NULL, NULL, true, 5),
  ('risk_report', '🛡️ Risikoanalyse', '🛡️ Risk Report',
   'Få en detaljert rapport om din trading-risiko', 'Get a detailed report on your trading risk',
   200, NULL, NULL, true, 6)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- SEKSJON B — Nye tabeller (stille doede kall i dag)
-- ═══════════════════════════════════════════════════════════════════

-- B1. market_data (OHLCV-rader; market-intelligence + market-regime)
CREATE TABLE IF NOT EXISTS public.market_data (
  symbol text NOT NULL,
  "timestamp" timestamptz NOT NULL,
  open numeric NOT NULL,
  high numeric NOT NULL,
  low numeric NOT NULL,
  close numeric NOT NULL,
  volume numeric DEFAULT 0,
  CONSTRAINT market_data_pkey PRIMARY KEY (symbol, "timestamp")
);

ALTER TABLE public.market_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Market data is public" ON public.market_data;
CREATE POLICY "Market data is public" ON public.market_data
  FOR SELECT USING (true);

-- B2. market_ohlcv_cache (cache per symbol; onConflict='symbol')
CREATE TABLE IF NOT EXISTS public.market_ohlcv_cache (
  symbol text NOT NULL,
  ohlcv_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT market_ohlcv_cache_pkey PRIMARY KEY (symbol)
);

ALTER TABLE public.market_ohlcv_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "OHLCV cache is public" ON public.market_ohlcv_cache;
CREATE POLICY "OHLCV cache is public" ON public.market_ohlcv_cache
  FOR SELECT USING (true);

-- B3. regime_cache (cache per symbol; onConflict='symbol')
CREATE TABLE IF NOT EXISTS public.regime_cache (
  symbol text NOT NULL,
  regime_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT regime_cache_pkey PRIMARY KEY (symbol)
);

ALTER TABLE public.regime_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Regime cache is public" ON public.regime_cache;
CREATE POLICY "Regime cache is public" ON public.regime_cache
  FOR SELECT USING (true);

-- B4. backtest_cache (onConflict='symbol,strategy_id,period_months')
CREATE TABLE IF NOT EXISTS public.backtest_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  strategy_id text NOT NULL,
  period_months integer NOT NULL,
  result_hash text,
  result_data jsonb NOT NULL,
  metrics_summary jsonb,
  usd_nok_rate numeric,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT backtest_cache_pkey PRIMARY KEY (id),
  CONSTRAINT backtest_cache_unique_key UNIQUE (symbol, strategy_id, period_months)
);

ALTER TABLE public.backtest_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Backtest cache is public" ON public.backtest_cache;
CREATE POLICY "Backtest cache is public" ON public.backtest_cache
  FOR SELECT USING (true);

-- B5. auto_trading_reviews (performance-review.ts; 11 insert-kolonner)
CREATE TABLE IF NOT EXISTS public.auto_trading_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid,
  generated_at timestamptz,
  metrics jsonb,
  assessment jsonb,
  market_context jsonb,
  immediate_actions jsonb,
  weekly_goals jsonb,
  what_worked jsonb,
  what_didnt jsonb,
  lessons_learned jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT auto_trading_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT auto_trading_reviews_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auto_trading_reviews_user_id
  ON public.auto_trading_reviews USING btree (user_id, generated_at DESC);

ALTER TABLE public.auto_trading_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own reviews" ON public.auto_trading_reviews;
CREATE POLICY "Users can view own reviews" ON public.auto_trading_reviews
  FOR SELECT USING (auth.uid() = user_id);

-- B6. campaign_clicks (admin/stats teller rader; ingen historikk i repo
-- -> minimalt klikk-tracking-skjema. Skriving skjer via service-role.)
CREATE TABLE IF NOT EXISTS public.campaign_clicks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign text,
  source text,
  clicked_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT campaign_clicks_pkey PRIMARY KEY (id)
);

ALTER TABLE public.campaign_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign_clicks_service_role" ON public.campaign_clicks;
CREATE POLICY "campaign_clicks_service_role" ON public.campaign_clicks
  FOR ALL USING (public.is_service_role());
