-- ============================================================================
-- User Achievements — for gamification: achievements + streaks + badges
-- ============================================================================
-- Opprettet: 2026-07-11
-- 
-- Tabeller:
--   user_achievements     — Sporede prestasjoner per bruker
-- 
-- Funksjoner:
--   check_and_award_achievements() — Sjekk og tildel achievements basert på data
--   check_login_streak()           — Oppdater streak ved innlogging
-- ============================================================================

-- ============================================================================
-- 1. user_achievements
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_achievements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_type  TEXT NOT NULL CHECK (achievement_type IN (
    'first_trade',
    'streak_7_days',
    'profit_master',
    'top_10_percent',
    'joker_master',
    'whale'
  )),
  earned_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata          JSONB DEFAULT '{}'::jsonb,
  UNIQUE (user_id, achievement_type)
);

-- Indeks for raskt oppslag per bruker
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements (user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_type ON user_achievements (achievement_type);
CREATE INDEX IF NOT EXISTS idx_user_achievements_earned ON user_achievements (earned_at DESC);

-- RLS
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_achievements' AND policyname = 'user_achievements_select_own'
  ) THEN
    CREATE POLICY user_achievements_select_own ON user_achievements
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_achievements' AND policyname = 'user_achievements_insert_service'
  ) THEN
    CREATE POLICY user_achievements_insert_service ON user_achievements
      FOR INSERT WITH CHECK (false);
  END IF;
END $$;

GRANT SELECT ON user_achievements TO authenticated;
GRANT SELECT ON user_achievements TO service_role;
GRANT INSERT ON user_achievements TO service_role;

-- ============================================================================
-- 2. Funksjon: check_and_award_achievements(p_user_id)
--    Sjekker alle 6 achievements for en gitt bruker og tildeler nye
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_and_award_achievements(p_user_id UUID)
RETURNS TABLE (
  achievement_type TEXT,
  newly_awarded    BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_achievement TEXT;
  v_newly_awarded BOOLEAN;
  v_count INTEGER;
  v_streak INTEGER;
  v_pnl NUMERIC;
  v_lb_rank NUMERIC;
  v_lb_total NUMERIC;
  v_joker_count INTEGER;
  v_balance NUMERIC;
  v_rank_pct NUMERIC;
BEGIN
  -- 1. Første trade — minst 1 trade i trades-tabellen
  SELECT COUNT(*) INTO v_count FROM public.trades WHERE user_id = p_user_id;
  IF v_count >= 1 AND NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_type = 'first_trade') THEN
    INSERT INTO public.user_achievements (user_id, achievement_type, metadata)
    VALUES (p_user_id, 'first_trade', jsonb_build_object('total_trades', v_count));
    RETURN QUERY SELECT 'first_trade'::TEXT, true::BOOLEAN;
  END IF;

  -- 2. 7 dagers streak — sjekk trading_sessions.created_at for 7 sammenhengende dager
  WITH daily_trades AS (
    SELECT DISTINCT DATE(created_at) AS trade_date
    FROM public.trading_sessions
    WHERE user_id = p_user_id
  ),
  streaks AS (
    SELECT trade_date,
           trade_date - ROW_NUMBER() OVER (ORDER BY trade_date)::INTEGER AS grp
    FROM daily_trades
  ),
  streak_lengths AS (
    SELECT COUNT(*) AS streak_len
    FROM streaks
    GROUP BY grp
  )
  SELECT COALESCE(MAX(streak_len), 0) INTO v_streak FROM streak_lengths;

  IF v_streak >= 7 AND NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_type = 'streak_7_days') THEN
    INSERT INTO public.user_achievements (user_id, achievement_type, metadata)
    VALUES (p_user_id, 'streak_7_days', jsonb_build_object('streak_days', v_streak));
    RETURN QUERY SELECT 'streak_7_days'::TEXT, true::BOOLEAN;
  END IF;

  -- 3. Profit-mester — 10 000 kr i profit fra trades
  SELECT COALESCE(SUM(realized_pnl), 0) INTO v_pnl
  FROM public.trades
  WHERE user_id = p_user_id AND realized_pnl IS NOT NULL;

  IF v_pnl >= 10000 AND NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_type = 'profit_master') THEN
    INSERT INTO public.user_achievements (user_id, achievement_type, metadata)
    VALUES (p_user_id, 'profit_master', jsonb_build_object('total_pnl', v_pnl));
    RETURN QUERY SELECT 'profit_master'::TEXT, true::BOOLEAN;
  END IF;

  -- 4. Topp 10% — er brukeren i topp 10% av leaderboard_bots?
  --    Sjekker om brukerens rank er innenfor 10% av totalt antall bots
  SELECT COUNT(*) INTO v_lb_total FROM public.leaderboard_bots WHERE is_active = true AND rank IS NOT NULL;
  IF v_lb_total > 0 THEN
    SELECT rank INTO v_lb_rank FROM public.leaderboard_bots WHERE user_id = p_user_id AND is_active = true;
    IF v_lb_rank IS NOT NULL THEN
      v_rank_pct := (v_lb_rank::NUMERIC / v_lb_total::NUMERIC) * 100;
      IF v_rank_pct <= 10 AND NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_type = 'top_10_percent') THEN
        INSERT INTO public.user_achievements (user_id, achievement_type, metadata)
        VALUES (p_user_id, 'top_10_percent', jsonb_build_object('rank', v_lb_rank, 'total', v_lb_total, 'top_pct', ROUND(v_rank_pct, 1)));
        RETURN QUERY SELECT 'top_10_percent'::TEXT, true::BOOLEAN;
      END IF;
    END IF;
  END IF;

  -- 5. Joker-mester — fullført 10 Joker-trades
  SELECT COUNT(*) INTO v_joker_count
  FROM public.trades
  WHERE user_id = p_user_id AND joker_trade = true;

  IF v_joker_count >= 10 AND NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_type = 'joker_master') THEN
    INSERT INTO public.user_achievements (user_id, achievement_type, metadata)
    VALUES (p_user_id, 'joker_master', jsonb_build_object('joker_trades', v_joker_count));
    RETURN QUERY SELECT 'joker_master'::TEXT, true::BOOLEAN;
  END IF;

  -- 6. Whale — paper balance over 500 000 kr
  SELECT paper_balance INTO v_balance
  FROM public.user_profiles
  WHERE id = p_user_id;

  IF v_balance IS NOT NULL AND v_balance >= 500000 AND NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_type = 'whale') THEN
    INSERT INTO public.user_achievements (user_id, achievement_type, metadata)
    VALUES (p_user_id, 'whale', jsonb_build_object('paper_balance', v_balance));
    RETURN QUERY SELECT 'whale'::TEXT, true::BOOLEAN;
  END IF;

  -- If we got here, no new achievements were awarded
  -- (we return empty set for "none awarded" — caller checks row count)
END;
$$;

-- ============================================================================
-- 3. Funksjon: get_user_achievements(p_user_id)
--    Henter alle achievements for en bruker med metadata
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_achievements(p_user_id UUID)
RETURNS TABLE (
  achievement_type TEXT,
  earned_at        TIMESTAMPTZ,
  metadata         JSONB
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT achievement_type, earned_at, metadata
  FROM public.user_achievements
  WHERE user_id = p_user_id
  ORDER BY earned_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_award_achievements TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_achievements TO authenticated, service_role;
