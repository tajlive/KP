-- Sikrer at Sprint 8 tabeller finnes (fiks for delvis feilet migrasjon)
SET statement_timeout = '30s';

-- Opprett auto_trading_strategies hvis den ikke finnes
CREATE TABLE IF NOT EXISTS public.auto_trading_strategies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Legg til manglende kolonner (i riktig rekkefølge)
ALTER TABLE public.auto_trading_strategies
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS strategy_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS trading_mode TEXT NOT NULL DEFAULT 'paper'
    CHECK (trading_mode IN ('paper', 'live')),
  ADD COLUMN IF NOT EXISTS capital_nok  NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS capital_usdt NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT NOW();

-- Fjern NOT NULL fra strategy_id midlertidig hvis den finnes
ALTER TABLE public.auto_trading_strategies 
  ALTER COLUMN strategy_id DROP NOT NULL;

-- UNIQUE constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ats_user_strategy_unique'
  ) THEN
    ALTER TABLE public.auto_trading_strategies
      ADD CONSTRAINT ats_user_strategy_unique UNIQUE (user_id, strategy_id);
  END IF;
END;
$$;

-- Opprett bot_health hvis den ikke finnes
CREATE TABLE IF NOT EXISTS public.bot_health (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Legg til user_id på bot_health
ALTER TABLE public.bot_health
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS bot_health_user_id_idx 
  ON public.bot_health (user_id);

-- push_subscriptions tabell
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   TEXT        NOT NULL UNIQUE,
  p256dh     TEXT        NOT NULL,
  auth       TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Dropp eksisterende policy hvis den finnes for å unngå duplikatfeil
DROP POLICY IF EXISTS "push_subs_all_own" ON public.push_subscriptions;

CREATE POLICY "push_subs_all_own"
  ON public.push_subscriptions FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS push_subs_user_idx
  ON public.push_subscriptions (user_id);
