-- Copy-trading discover: featured ordering + optional drawdown (cron kan fylle senere)
ALTER TABLE public.leaderboard_bots
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_drawdown_30d numeric NULL;

COMMENT ON COLUMN public.leaderboard_bots.featured IS 'Kuraterte ledere vises først i discover';
COMMENT ON COLUMN public.leaderboard_bots.sort_order IS 'Lavere tall først innenfor samme featured-gruppe';
COMMENT ON COLUMN public.leaderboard_bots.max_drawdown_30d IS 'Valgfri; fylles av pålitelig jobb før visning i UI';
