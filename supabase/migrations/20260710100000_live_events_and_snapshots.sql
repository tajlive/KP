-- ============================================================================
-- Live Events + Leaderboard Snapshots — for JokerPush, Social Proof, LiveFeed
-- ============================================================================
-- Opprettet: 2026-07-10
-- 
-- Tabeller:
--   live_events           — Sanntidshendelser fra hele plattformen
--   leaderboard_snapshots — Periodiske øyeblikksbilder av leaderboard
-- 
-- Trigger-funksjoner:
--   on_trade_create_event       — Oppretter live_event ved ny trade
--   on_leaderboard_change_event — Oppretter leaderboard change event
-- ============================================================================

-- ============================================================================
-- 1. live_events
-- ============================================================================

CREATE TABLE IF NOT EXISTS live_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type                TEXT NOT NULL CHECK (type IN ('trade', 'leaderboard', 'signup', 'signal')),
  title               TEXT NOT NULL DEFAULT '',
  description         TEXT,
  user_display_name   TEXT,
  metadata            JSONB DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indeks for LiveFeed — siste 20 hendelser
CREATE INDEX IF NOT EXISTS idx_live_events_created_at ON live_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_events_type ON live_events (type);

-- RLS: live_events er offentlig lesbar, kun service_role kan skrive
ALTER TABLE live_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'live_events' AND policyname = 'live_events_select_anon'
  ) THEN
    CREATE POLICY live_events_select_anon ON live_events
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'live_events' AND policyname = 'live_events_insert_service'
  ) THEN
    CREATE POLICY live_events_insert_service ON live_events
      FOR INSERT WITH CHECK (false);
  END IF;
END $$;

GRANT SELECT ON live_events TO anon, authenticated, service_role;
GRANT INSERT ON live_events TO service_role;

-- ============================================================================
-- 2. leaderboard_snapshots
-- ============================================================================

CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period              TEXT NOT NULL CHECK (period IN ('weekly', 'monthly', 'all_time')),
  user_id             UUID NOT NULL,
  rank                INTEGER NOT NULL,
  return_pct          NUMERIC(10,2) NOT NULL DEFAULT 0,
  win_rate            NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_trades        INTEGER NOT NULL DEFAULT 0,
  user_display_name   TEXT,
  snapped_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_period ON leaderboard_snapshots (period, snapped_at DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_user ON leaderboard_snapshots (user_id);

ALTER TABLE leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'leaderboard_snapshots' AND policyname = 'leaderboard_snapshots_select_anon'
  ) THEN
    CREATE POLICY leaderboard_snapshots_select_anon ON leaderboard_snapshots
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'leaderboard_snapshots' AND policyname = 'leaderboard_snapshots_insert_service'
  ) THEN
    CREATE POLICY leaderboard_snapshots_insert_service ON leaderboard_snapshots
      FOR INSERT WITH CHECK (false);
  END IF;
END $$;

GRANT SELECT ON leaderboard_snapshots TO anon, authenticated, service_role;
GRANT INSERT ON leaderboard_snapshots TO service_role;

-- ============================================================================
-- 3. Trigger: Opprett live_event ved ny trade (kun joker_trade)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.on_trade_create_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_display_name TEXT;
BEGIN
  -- Kun for joker_trades
  IF NEW.joker_trade IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Hent brukerens display_name
  SELECT COALESCE(display_name, 'Trader') INTO v_display_name
  FROM public.user_profiles
  WHERE id = NEW.user_id;

  -- Opprett live_event
  INSERT INTO public.live_events (type, title, description, user_display_name, metadata, created_at)
  VALUES (
    'trade',
    CASE WHEN NEW.side = 'buy' THEN '🃏 Kjøp' ELSE '🃏 Salg' END || ' ' || COALESCE(NEW.trading_pair, ''),
    COALESCE(NEW.joker_explanation, '🎭 JokerTrade'),
    v_display_name,
    jsonb_build_object(
      'trade_id', NEW.id,
      'side', NEW.side,
      'trading_pair', NEW.trading_pair,
      'quantity', NEW.quantity,
      'price', NEW.price
    ),
    COALESCE(NEW.executed_at, now())
  );

  RETURN NEW;
END;
$$;

-- Slett gammel trigger først (hvis finnes)
DROP TRIGGER IF EXISTS trg_trade_joker_event ON public.trades;

CREATE TRIGGER trg_trade_joker_event
  AFTER INSERT ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.on_trade_create_event();

-- ============================================================================
-- 4. Trigger: Opprett leaderboard change events
-- ============================================================================

CREATE OR REPLACE FUNCTION public.on_leaderboard_change_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_prev_rank INTEGER;
  v_display_name TEXT;
  v_title TEXT;
  v_description TEXT;
BEGIN
  -- Finn forrige snapshot for denne brukeren og perioden
  SELECT rank INTO v_prev_rank
  FROM public.leaderboard_snapshots
  WHERE user_id = NEW.user_id
    AND period = NEW.period
    AND id != NEW.id
  ORDER BY snapped_at DESC
  LIMIT 1;

  -- Hvis ingen forrige rank, returner (første snapshot)
  IF v_prev_rank IS NULL THEN
    RETURN NEW;
  END IF;

  -- Hent display_name
  SELECT COALESCE(display_name, 'Trader') INTO v_display_name
  FROM public.user_profiles
  WHERE id = NEW.user_id;

  -- Bare opprett event hvis rank endret seg
  IF NEW.rank < v_prev_rank THEN
    v_title := '⬆️ ' || v_display_name || ' klatret til #' || NEW.rank;
    v_description := v_display_name || ' gikk fra #' || v_prev_rank || ' til #' || NEW.rank || ' på ' || NEW.period || ' leaderboard';
  ELSIF NEW.rank > v_prev_rank THEN
    v_title := '⬇️ ' || v_display_name || ' falt til #' || NEW.rank;
    v_description := v_display_name || ' falt fra #' || v_prev_rank || ' til #' || NEW.rank || ' på ' || NEW.period || ' leaderboard';
  ELSE
    RETURN NEW; -- Ingen endring
  END IF;

  INSERT INTO public.live_events (type, title, description, user_display_name, metadata, created_at)
  VALUES (
    'leaderboard',
    v_title,
    v_description,
    v_display_name,
    jsonb_build_object(
      'user_id', NEW.user_id,
      'period', NEW.period,
      'old_rank', v_prev_rank,
      'new_rank', NEW.rank
    ),
    NEW.snapped_at
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leaderboard_snapshot_event ON public.leaderboard_snapshots;

CREATE TRIGGER trg_leaderboard_snapshot_event
  AFTER INSERT ON public.leaderboard_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.on_leaderboard_change_event();

-- ============================================================================
-- 5. Funksjon: Ta snapshot av leaderboard (kalles av cron)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.snapshot_leaderboard(p_period TEXT DEFAULT 'weekly')
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Kopier current leaderboard entries til snapshots fra leaderboard_bots
  INSERT INTO public.leaderboard_snapshots (period, user_id, rank, return_pct, win_rate, total_trades, user_display_name, snapped_at)
  SELECT
    p_period,
    lb.user_id,
    COALESCE(lb.rank, 0),
    COALESCE(lb.pnl_30d, 0),
    COALESCE(lb.win_rate, 0),
    0, -- total_trades kommer fra aggregert teller
    lb.display_name,
    now()
  FROM public.leaderboard_bots lb
  WHERE lb.is_active = true AND lb.rank IS NOT NULL
  ORDER BY lb.rank ASC
  LIMIT 100;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================================================
-- 6. Funksjon: Opprett signup-event (kalles ved ny bruker)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.on_user_signup_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.live_events (type, title, description, user_display_name, metadata, created_at)
  VALUES (
    'signup',
    '🎉 Ny trader: ' || COALESCE(NEW.display_name, 'Trader'),
    COALESCE(NEW.display_name, 'Trader') || ' ble med i Klarpakke-fellesskapet!',
    NEW.display_name,
    jsonb_build_object('user_id', NEW.id, 'tier', NEW.tier),
    now()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_signup_event ON public.user_profiles;

CREATE TRIGGER trg_user_signup_event
  AFTER INSERT ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.on_user_signup_event();
